import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Batch } from '../entities/batch.entity';
import { RepairOrder } from '../entities/repair-order.entity';
import { SparePartScan } from '../entities/spare-part-scan.entity';
import { CustomerSignPhoto } from '../entities/customer-sign-photo.entity';
import { ScanDetail } from '../entities/scan-detail.entity';
import { DirtyRecord } from '../entities/dirty-record.entity';
import { StateMachineService } from '../state-machine/state-machine.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BatchStatus } from '../common/enums/batch-status.enum';
import { CreateBatchDto } from './dto/create-batch.dto';
import { DirtyRecordService } from '../dirty-record/dirty-record.service';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
    @InjectRepository(RepairOrder)
    private repairOrderRepository: Repository<RepairOrder>,
    @InjectRepository(SparePartScan)
    private sparePartScanRepository: Repository<SparePartScan>,
    @InjectRepository(CustomerSignPhoto)
    private customerSignPhotoRepository: Repository<CustomerSignPhoto>,
    @InjectRepository(ScanDetail)
    private scanDetailRepository: Repository<ScanDetail>,
    @InjectRepository(DirtyRecord)
    private dirtyRecordRepository: Repository<DirtyRecord>,
    private stateMachineService: StateMachineService,
    private dirtyRecordService: DirtyRecordService,
    private dataSource: DataSource,
  ) {}

  generateBatchNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BATCH${dateStr}${random}`;
  }

  async create(createBatchDto: CreateBatchDto, user: CurrentUser): Promise<Batch> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const batchNo = createBatchDto.batchNo || this.generateBatchNo();
      
      const existingBatch = await this.batchRepository.findOne({ where: { batchNo } });
      if (existingBatch) {
        throw new BadRequestException('批次号已存在');
      }

      const batch = this.batchRepository.create({
        batchNo,
        description: createBatchDto.description,
        createdById: user.id,
        createdByName: user.name,
      });

      const savedBatch = await queryRunner.manager.save(batch);

      if (createBatchDto.repairOrders?.length) {
        const repairOrders = createBatchDto.repairOrders.map(ro => 
          this.repairOrderRepository.create({
            ...ro,
            batchId: savedBatch.id,
          })
        );
        await queryRunner.manager.save(repairOrders);
        savedBatch.totalRepairOrders = repairOrders.length;
      }

      if (createBatchDto.sparePartScans?.length) {
        const sparePartScansData = createBatchDto.sparePartScans;
        const sparePartScans = sparePartScansData.map(sps => 
          this.sparePartScanRepository.create({
            ...sps,
            partType: sps.partType as any,
            batchId: savedBatch.id,
          } as any)
        );
        await queryRunner.manager.save(sparePartScans);
        savedBatch.totalSparePartScans = sparePartScans.length;
        savedBatch.totalAmount = sparePartScansData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      }

      if (createBatchDto.customerSignPhotos?.length) {
        const customerSignPhotos = createBatchDto.customerSignPhotos.map(csp => 
          this.customerSignPhotoRepository.create({
            ...csp,
            batchId: savedBatch.id,
          })
        );
        await queryRunner.manager.save(customerSignPhotos);
        savedBatch.totalCustomerSignPhotos = customerSignPhotos.length;
      }

      if (createBatchDto.scanDetails?.length) {
        const scanDetails = createBatchDto.scanDetails.map(sd => 
          this.scanDetailRepository.create({
            ...sd,
            partType: sd.partType as any,
            batchId: savedBatch.id,
          } as any)
        );
        await queryRunner.manager.save(scanDetails);
        savedBatch.totalScanDetails = scanDetails.length;
      }

      await queryRunner.manager.save(savedBatch);

      await this.dirtyRecordService.analyzeAndCreateDirtyRecords(savedBatch.id, queryRunner);

      await queryRunner.commitTransaction();

      return this.findOne(savedBatch.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(user: CurrentUser): Promise<Batch[]> {
    return this.batchRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['repairOrders', 'sparePartScans', 'customerSignPhotos', 'scanDetails', 'dirtyRecords'],
    });
    if (!batch) {
      throw new NotFoundException('批次不存在');
    }
    return batch;
  }

  async submitForReview(id: string, user: CurrentUser): Promise<Batch> {
    const batch = await this.findOne(id);
    
    const unresolvedDirtyCount = await this.dirtyRecordRepository.count({
      where: { batchId: id, isResolved: false },
    });
    
    if (unresolvedDirtyCount > 0) {
      throw new BadRequestException(
        `存在 ${unresolvedDirtyCount} 条未处理的脏记录，请先处理后再提交`,
      );
    }

    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.PENDING_REVIEW,
      user,
      '提交复核',
    );

    return this.batchRepository.save(updatedBatch);
  }

  async approve(id: string, user: CurrentUser, opinion?: string): Promise<Batch> {
    const batch = await this.findOne(id);
    batch.reviewOpinion = opinion;
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.APPROVED,
      user,
      opinion || '复核通过',
    );
    return this.batchRepository.save(updatedBatch);
  }

  async reject(id: string, user: CurrentUser, reason: string): Promise<Batch> {
    const batch = await this.findOne(id);
    batch.reviewOpinion = reason;
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.REJECTED,
      user,
      reason,
    );
    return this.batchRepository.save(updatedBatch);
  }

  async freeze(id: string, user: CurrentUser, reason: string): Promise<Batch> {
    const batch = await this.findOne(id);
    batch.statusBeforeFrozen = batch.status;
    batch.freezeReason = reason;
    batch.manualReason = reason;
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.FROZEN,
      user,
      reason,
    );
    return this.batchRepository.save(updatedBatch);
  }

  async unfreeze(id: string, user: CurrentUser, reason: string): Promise<Batch> {
    const batch = await this.findOne(id);
    const targetStatus = batch.statusBeforeFrozen || BatchStatus.APPROVED;
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      targetStatus,
      user,
      reason,
    );
    return this.batchRepository.save(updatedBatch);
  }

  async findScanDetails(batchId: string): Promise<ScanDetail[]> {
    await this.findOne(batchId);
    return this.scanDetailRepository.find({ where: { batchId } });
  }

  async findRepairOrders(batchId: string): Promise<RepairOrder[]> {
    await this.findOne(batchId);
    return this.repairOrderRepository.find({ where: { batchId } });
  }

  async findSparePartScans(batchId: string): Promise<SparePartScan[]> {
    await this.findOne(batchId);
    return this.sparePartScanRepository.find({ where: { batchId } });
  }

  async findCustomerSignPhotos(batchId: string): Promise<CustomerSignPhoto[]> {
    await this.findOne(batchId);
    return this.customerSignPhotoRepository.find({ where: { batchId } });
  }

  async settle(id: string, user: CurrentUser): Promise<Batch> {
    const batch = await this.findOne(id);
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.SETTLED,
      user,
      '结算完成',
    );
    return this.batchRepository.save(updatedBatch);
  }

  async cancel(id: string, user: CurrentUser, reason: string): Promise<Batch> {
    const batch = await this.findOne(id);
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.CANCELLED,
      user,
      reason,
    );
    return this.batchRepository.save(updatedBatch);
  }

  async archive(id: string, user: CurrentUser): Promise<Batch> {
    const batch = await this.findOne(id);
    const updatedBatch = await this.stateMachineService.transition(
      batch,
      BatchStatus.ARCHIVED,
      user,
      '归档完成',
    );
    return this.batchRepository.save(updatedBatch);
  }

  async updateTotals(batchId: string): Promise<void> {
    const batch = await this.findOne(batchId);
    
    batch.totalRepairOrders = await this.repairOrderRepository.count({ where: { batchId } });
    batch.totalSparePartScans = await this.sparePartScanRepository.count({ where: { batchId } });
    batch.totalCustomerSignPhotos = await this.customerSignPhotoRepository.count({ where: { batchId } });
    batch.totalScanDetails = await this.scanDetailRepository.count({ where: { batchId } });
    
    const scans = await this.sparePartScanRepository.find({ where: { batchId } });
    batch.totalAmount = scans.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    await this.batchRepository.save(batch);
  }
}
