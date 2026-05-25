import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { DirtyRecord } from '../entities/dirty-record.entity';
import { RepairOrder } from '../entities/repair-order.entity';
import { SparePartScan } from '../entities/spare-part-scan.entity';
import { CustomerSignPhoto } from '../entities/customer-sign-photo.entity';
import { ScanDetail } from '../entities/scan-detail.entity';
import { Batch } from '../entities/batch.entity';
import { DirtyType } from '../common/enums/dirty-type.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class DirtyRecordService {
  constructor(
    @InjectRepository(DirtyRecord)
    private dirtyRecordRepository: Repository<DirtyRecord>,
    @InjectRepository(RepairOrder)
    private repairOrderRepository: Repository<RepairOrder>,
    @InjectRepository(SparePartScan)
    private sparePartScanRepository: Repository<SparePartScan>,
    @InjectRepository(CustomerSignPhoto)
    private customerSignPhotoRepository: Repository<CustomerSignPhoto>,
    @InjectRepository(ScanDetail)
    private scanDetailRepository: Repository<ScanDetail>,
  ) {}

  async analyzeAndCreateDirtyRecords(batchId: string, queryRunner?: QueryRunner): Promise<void> {
    const manager = queryRunner?.manager || this.dirtyRecordRepository.manager;

    const repairOrders = await manager.find(RepairOrder, { where: { batchId } });
    for (const ro of repairOrders) {
      await this.analyzeRepairOrder(ro, batchId, manager);
    }

    const sparePartScans = await manager.find(SparePartScan, { where: { batchId } });
    for (const sps of sparePartScans) {
      await this.analyzeSparePartScan(sps, batchId, manager);
    }

    const scanDetails = await manager.find(ScanDetail, { where: { batchId } });
    for (const sd of scanDetails) {
      await this.analyzeScanDetail(sd, batchId, manager);
    }

    await this.checkCrossDay(batchId, manager);
    await this.checkNameChanged(batchId, manager);
    await this.checkConflicts(batchId, manager);

    const count = await manager.count(DirtyRecord, { where: { batchId, isResolved: false } });
    const batch = await manager.findOne(Batch, { where: { id: batchId } });
    if (batch) {
      batch.totalDirtyRecords = count;
      await manager.save(batch);
    }
  }

  private async analyzeRepairOrder(ro: RepairOrder, batchId: string, manager: any): Promise<void> {
    const missingFields: string[] = [];
    if (!ro.orderNo) missingFields.push('orderNo');
    if (!ro.customerName) missingFields.push('customerName');
    if (!ro.repairDate) missingFields.push('repairDate');

    if (missingFields.length > 0) {
      await this.createDirtyRecord(
        batchId,
        'repair_order',
        ro.id,
        DirtyType.MISSING_FIELD,
        JSON.stringify(ro),
        missingFields,
        manager,
      );
      ro.isDirty = true;
      await manager.save(ro);
    }
  }

  private async analyzeSparePartScan(sps: SparePartScan, batchId: string, manager: any): Promise<void> {
    const missingFields: string[] = [];
    if (!sps.scanNo) missingFields.push('scanNo');
    if (!sps.partCode) missingFields.push('partCode');
    if (!sps.partName) missingFields.push('partName');
    if (!sps.quantity) missingFields.push('quantity');
    if (!sps.unitPrice) missingFields.push('unitPrice');

    if (missingFields.length > 0) {
      await this.createDirtyRecord(
        batchId,
        'spare_part_scan',
        sps.id,
        DirtyType.MISSING_FIELD,
        JSON.stringify(sps),
        missingFields,
        manager,
      );
      sps.isDirty = true;
      await manager.save(sps);
    }
  }

  private async analyzeScanDetail(sd: ScanDetail, batchId: string, manager: any): Promise<void> {
    const missingFields: string[] = [];
    if (!sd.detailNo) missingFields.push('detailNo');
    if (!sd.barcode) missingFields.push('barcode');

    if (missingFields.length > 0) {
      await this.createDirtyRecord(
        batchId,
        'scan_detail',
        sd.id,
        DirtyType.MISSING_FIELD,
        JSON.stringify(sd),
        missingFields,
        manager,
      );
      sd.isDirty = true;
      await manager.save(sd);
    }
  }

  private async checkCrossDay(batchId: string, manager: any): Promise<void> {
    const scanDetails = await manager.find(ScanDetail, { where: { batchId } });
    if (scanDetails.length < 2) return;

    const dates = new Set(
      scanDetails
        .filter(sd => sd.scanTime)
        .map(sd => sd.scanTime.toISOString().slice(0, 10)),
    );

    if (dates.size > 1) {
      await this.createDirtyRecord(
        batchId,
        'scan_detail',
        'cross_day_check',
        DirtyType.CROSS_DAY,
        JSON.stringify({ dates: Array.from(dates) }),
        ['scanTime'],
        manager,
      );
    }
  }

  private async checkNameChanged(batchId: string, manager: any): Promise<void> {
    const sparePartScans = await manager.find(SparePartScan, { where: { batchId } });
    
    const partMap = new Map<string, Set<string>>();
    for (const sps of sparePartScans) {
      if (!partMap.has(sps.partCode)) {
        partMap.set(sps.partCode, new Set());
      }
      partMap.get(sps.partCode).add(sps.partName);
    }

    for (const [partCode, names] of partMap) {
      if (names.size > 1) {
        await this.createDirtyRecord(
          batchId,
          'spare_part_scan',
          partCode,
          DirtyType.NAME_CHANGED,
          JSON.stringify({ partCode, names: Array.from(names) }),
          ['partName'],
          manager,
        );
      }
    }
  }

  private async checkConflicts(batchId: string, manager: any): Promise<void> {
    const sparePartScans = await manager.find(SparePartScan, { where: { batchId } });
    const scanDetails = await manager.find(ScanDetail, { where: { batchId } });

    for (const sps of sparePartScans) {
      const relatedDetails = scanDetails.filter(sd => sd.partCode === sps.partCode);
      if (relatedDetails.length === 0) continue;

      const totalQty = relatedDetails.reduce((sum, sd) => sum + (sd.quantity || 0), 0);
      if (totalQty !== sps.quantity) {
        await this.createDirtyRecord(
          batchId,
          'spare_part_scan',
          sps.id,
          DirtyType.QUANTITY_CONFLICT,
          JSON.stringify({ spsQty: sps.quantity, detailsQty: totalQty }),
          ['quantity'],
          manager,
        );
      }

      const totalAmount = relatedDetails.reduce((sum, sd) => sum + (sd.totalAmount || 0), 0);
      if (Math.abs(totalAmount - sps.totalAmount) > 0.01) {
        await this.createDirtyRecord(
          batchId,
          'spare_part_scan',
          sps.id,
          DirtyType.AMOUNT_CONFLICT,
          JSON.stringify({ spsAmount: sps.totalAmount, detailsAmount: totalAmount }),
          ['totalAmount'],
          manager,
        );
      }
    }
  }

  private async createDirtyRecord(
    batchId: string,
    sourceType: string,
    sourceId: string,
    dirtyType: DirtyType,
    originalContent: string,
    conflictFields: string[],
    manager: any,
  ): Promise<void> {
    const existing = await manager.findOne(DirtyRecord, {
      where: { batchId, sourceType, sourceId, dirtyType },
    });
    if (existing) return;

    const dirtyRecord = manager.create(DirtyRecord, {
      batchId,
      sourceType,
      sourceId,
      dirtyType,
      originalContent,
      conflictFields,
    });
    await manager.save(dirtyRecord);
  }

  async findByBatchId(batchId: string): Promise<DirtyRecord[]> {
    return this.dirtyRecordRepository.find({
      where: { batchId },
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(
    id: string,
    user: CurrentUser,
    handlingOpinion: string,
    resolvedContent: string,
  ): Promise<DirtyRecord> {
    const queryRunner = this.dirtyRecordRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const dirtyRecord = await manager.findOne(DirtyRecord, { where: { id } });
      if (!dirtyRecord) {
        throw new NotFoundException('脏记录不存在');
      }
      if (dirtyRecord.isResolved) {
        throw new BadRequestException('该脏记录已处理');
      }

      await this.applyResolvedContent(dirtyRecord, resolvedContent, manager);

      dirtyRecord.isResolved = true;
      dirtyRecord.handlingOpinion = handlingOpinion;
      dirtyRecord.resolvedContent = resolvedContent;
      dirtyRecord.resolvedBy = user.name;
      dirtyRecord.resolvedAt = new Date();

      const savedRecord = await manager.save(dirtyRecord);

      await this.updateSourceRecordDirtyFlag(dirtyRecord, manager);

      await this.updateBatchDirtyRecordCount(dirtyRecord.batchId, manager);

      await this.recalculateBatchTotals(dirtyRecord.batchId, manager);

      await queryRunner.commitTransaction();

      return savedRecord;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async applyResolvedContent(
    dirtyRecord: DirtyRecord,
    resolvedContent: string,
    manager: any,
  ): Promise<void> {
    try {
      const resolvedData = JSON.parse(resolvedContent);
      const { sourceType, sourceId } = dirtyRecord;

      switch (sourceType) {
        case 'repair_order': {
          const ro = await manager.findOne(RepairOrder, { where: { id: sourceId } });
          if (ro) {
            Object.assign(ro, resolvedData);
            ro.rawContent = JSON.stringify(ro);
            await manager.save(ro);
          }
          break;
        }
        case 'spare_part_scan': {
          if (dirtyRecord.dirtyType === DirtyType.NAME_CHANGED) {
            const partCode = sourceId;
            const scans = await manager.find(SparePartScan, {
              where: { batchId: dirtyRecord.batchId, partCode },
            });
            for (const sps of scans) {
              if (resolvedData.partName) {
                sps.partName = resolvedData.partName;
                sps.rawContent = JSON.stringify(sps);
                await manager.save(sps);
              }
            }
          } else {
            const sps = await manager.findOne(SparePartScan, { where: { id: sourceId } });
            if (sps) {
              Object.assign(sps, resolvedData);
              if (resolvedData.quantity !== undefined && resolvedData.unitPrice !== undefined) {
                sps.totalAmount = resolvedData.quantity * resolvedData.unitPrice;
              }
              sps.rawContent = JSON.stringify(sps);
              await manager.save(sps);
            }
          }
          break;
        }
        case 'scan_detail': {
          if (dirtyRecord.dirtyType === DirtyType.CROSS_DAY) {
            const dates = resolvedData.dates || [];
            const targetDate = resolvedData.targetDate;
            if (targetDate) {
              const details = await manager.find(ScanDetail, {
                where: { batchId: dirtyRecord.batchId },
              });
              for (const sd of details) {
                if (sd.scanTime) {
                  const dateStr = sd.scanTime.toISOString().slice(0, 10);
                  if (dates.includes(dateStr) && dateStr !== targetDate) {
                    const newDate = new Date(targetDate);
                    const timeStr = sd.scanTime.toISOString().slice(11);
                    sd.scanTime = new Date(targetDate + 'T' + timeStr);
                    sd.rawContent = JSON.stringify(sd);
                    await manager.save(sd);
                  }
                }
              }
            }
          } else {
            const sd = await manager.findOne(ScanDetail, { where: { id: sourceId } });
            if (sd) {
              Object.assign(sd, resolvedData);
              if (resolvedData.quantity !== undefined && resolvedData.unitPrice !== undefined) {
                sd.totalAmount = resolvedData.quantity * resolvedData.unitPrice;
              }
              sd.rawContent = JSON.stringify(sd);
              await manager.save(sd);
            }
          }
          break;
        }
      }
    } catch (e) {
      console.warn('解析 resolvedContent 失败，跳过原始数据修正:', e.message);
    }
  }

  private async updateSourceRecordDirtyFlag(
    dirtyRecord: DirtyRecord,
    manager: any,
  ): Promise<void> {
    const { sourceType, sourceId, batchId, dirtyType } = dirtyRecord;

    if (dirtyType === DirtyType.CROSS_DAY || dirtyType === DirtyType.NAME_CHANGED) {
      const remainingDirty = await manager.count(DirtyRecord, {
        where: { batchId, sourceType, dirtyType, isResolved: false },
      });
      if (remainingDirty === 0) {
        if (sourceType === 'scan_detail') {
          await manager.update(ScanDetail, { batchId }, { isDirty: false });
        } else if (sourceType === 'spare_part_scan') {
          await manager.update(SparePartScan, { batchId, partCode: sourceId }, { isDirty: false });
        }
      }
      return;
    }

    switch (sourceType) {
      case 'repair_order': {
        const remainingDirty = await manager.count(DirtyRecord, {
          where: { batchId, sourceType, sourceId, isResolved: false },
        });
        if (remainingDirty === 0) {
          await manager.update(RepairOrder, { id: sourceId }, { isDirty: false });
        }
        break;
      }
      case 'spare_part_scan': {
        const remainingDirty = await manager.count(DirtyRecord, {
          where: { batchId, sourceType, sourceId, isResolved: false },
        });
        if (remainingDirty === 0) {
          await manager.update(SparePartScan, { id: sourceId }, { isDirty: false });
        }
        break;
      }
      case 'scan_detail': {
        const remainingDirty = await manager.count(DirtyRecord, {
          where: { batchId, sourceType, sourceId, isResolved: false },
        });
        if (remainingDirty === 0) {
          await manager.update(ScanDetail, { id: sourceId }, { isDirty: false });
        }
        break;
      }
    }
  }

  private async updateBatchDirtyRecordCount(
    batchId: string,
    manager: any,
  ): Promise<void> {
    const unresolvedCount = await manager.count(DirtyRecord, {
      where: { batchId, isResolved: false },
    });
    const batch = await manager.findOne(Batch, { where: { id: batchId } });
    if (batch) {
      batch.totalDirtyRecords = unresolvedCount;
      await manager.save(batch);
    }
  }

  private async recalculateBatchTotals(
    batchId: string,
    manager: any,
  ): Promise<void> {
    const batch = await manager.findOne(Batch, { where: { id: batchId } });
    if (!batch) return;

    batch.totalRepairOrders = await manager.count(RepairOrder, { where: { batchId } });
    batch.totalSparePartScans = await manager.count(SparePartScan, { where: { batchId } });
    batch.totalCustomerSignPhotos = await manager.count(CustomerSignPhoto, { where: { batchId } });
    batch.totalScanDetails = await manager.count(ScanDetail, { where: { batchId } });

    const scans = await manager.find(SparePartScan, { where: { batchId } });
    batch.totalAmount = scans.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

    await manager.save(batch);
  }
}
