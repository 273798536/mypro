import { Repository, In } from 'typeorm';
import { Batch, BatchStatus, ImportStrategy } from '../entities/Batch';
import { LeaderRefund } from '../entities/LeaderRefund';
import { WarehouseReview } from '../entities/WarehouseReview';
import { AppDataSource } from '../database';
import { auditService } from './AuditService';
import * as dayjs from 'dayjs';

export interface CreateBatchOptions {
  batchNo?: string;
  cityCode: string;
  cityName: string;
  importStrategy?: ImportStrategy;
  operatorId?: string;
  operatorName?: string;
}

export interface UpdateBatchStatusOptions {
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  reason?: string;
}

export class BatchService {
  private batchRepository: Repository<Batch>;
  private refundRepository: Repository<LeaderRefund>;
  private reviewRepository: Repository<WarehouseReview>;

  constructor() {
    this.batchRepository = AppDataSource.getRepository(Batch);
    this.refundRepository = AppDataSource.getRepository(LeaderRefund);
    this.reviewRepository = AppDataSource.getRepository(WarehouseReview);
  }

  generateBatchNo(cityCode: string): string {
    const dateStr = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${cityCode}-${dateStr}-${random}`;
  }

  async createBatch(options: CreateBatchOptions): Promise<Batch> {
    const batchNo = options.batchNo || this.generateBatchNo(options.cityCode);

    const batch = this.batchRepository.create({
      batchNo,
      cityCode: options.cityCode,
      cityName: options.cityName,
      importStrategy: options.importStrategy || 'ignore',
      status: 'draft',
      createdBy: options.operatorId,
      updatedBy: options.operatorId,
    });

    const savedBatch = await this.batchRepository.save(batch);

    await auditService.logCreate('batch', savedBatch.id, savedBatch, {
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      batchId: savedBatch.id,
    });

    return savedBatch;
  }

  async getBatchById(id: string): Promise<Batch | null> {
    return await this.batchRepository.findOne({
      where: { id },
      relations: ['leaderRefunds', 'warehouseReviews'],
    });
  }

  async getBatchByNo(batchNo: string): Promise<Batch | null> {
    return await this.batchRepository.findOne({
      where: { batchNo },
      relations: ['leaderRefunds', 'warehouseReviews'],
    });
  }

  async listBatches(
    filters: {
      cityCode?: string;
      status?: BatchStatus;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: Batch[]; total: number }> {
    const queryBuilder = this.batchRepository.createQueryBuilder('batch')
      .orderBy('batch.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.cityCode) {
      queryBuilder.andWhere('batch.cityCode = :cityCode', { cityCode: filters.cityCode });
    }

    if (filters.status) {
      queryBuilder.andWhere('batch.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('batch.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('batch.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async submitBatch(batchId: string, options: UpdateBatchStatusOptions): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.status !== 'draft' && batch.status !== 'rejected') {
      throw new Error('只有草稿或驳回状态的批次可以提交');
    }

    const oldStatus = batch.status;
    batch.status = 'submitted';
    batch.submittedAt = new Date();
    batch.updatedBy = options.operatorId;

    const savedBatch = await this.batchRepository.save(batch);

    await auditService.logStatusChange('batch', batchId, oldStatus, 'submitted', 
      options.reason || '提交批次审核', {
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      operatorRole: options.operatorRole,
      batchId,
    });

    return savedBatch;
  }

  async rejectBatch(batchId: string, options: UpdateBatchStatusOptions & { reason: string }): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.status !== 'submitted') {
      throw new Error('只有已提交状态的批次可以驳回');
    }

    const oldStatus = batch.status;
    batch.status = 'rejected';
    batch.rejectedAt = new Date();
    batch.rejectReason = options.reason;
    batch.updatedBy = options.operatorId;

    const savedBatch = await this.batchRepository.save(batch);

    await auditService.logStatusChange('batch', batchId, oldStatus, 'rejected', options.reason, {
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      operatorRole: options.operatorRole,
      batchId,
    });

    return savedBatch;
  }

  async confirmBatch(batchId: string, options: UpdateBatchStatusOptions): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.status !== 'submitted') {
      throw new Error('只有已提交状态的批次可以确认');
    }

    const oldStatus = batch.status;
    batch.status = 'confirmed';
    batch.confirmedAt = new Date();
    batch.updatedBy = options.operatorId;

    const savedBatch = await this.batchRepository.save(batch);

    await auditService.logStatusChange('batch', batchId, oldStatus, 'confirmed', 
      options.reason || '批次二次确认通过', {
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      operatorRole: options.operatorRole,
      batchId,
    });

    return savedBatch;
  }

  async auditBatch(batchId: string, options: UpdateBatchStatusOptions & { remark?: string }): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.status !== 'confirmed') {
      throw new Error('只有已确认状态的批次可以审计');
    }

    const oldStatus = batch.status;
    batch.status = 'audited';
    batch.auditedAt = new Date();
    batch.auditRemark = options.remark;
    batch.updatedBy = options.operatorId;

    const savedBatch = await this.batchRepository.save(batch);

    await auditService.logStatusChange('batch', batchId, oldStatus, 'audited', 
      options.reason || '批次审计完成', {
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      operatorRole: options.operatorRole,
      batchId,
    });

    return savedBatch;
  }

  async recalculateBatchStats(batchId: string): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    const refunds = await this.refundRepository.find({ where: { batchId } });
    const reviews = await this.reviewRepository.find({ where: { batchId } });

    const totalAmount = refunds.reduce((sum, r) => sum + Number(r.refundAmount), 0);
    const matchedAmount = refunds.reduce((sum, r) => sum + Number(r.matchedAmount), 0);

    batch.refundCount = refunds.length;
    batch.reviewCount = reviews.length;
    batch.totalAmount = totalAmount;
    batch.matchedAmount = matchedAmount;
    batch.diffAmount = totalAmount - matchedAmount;

    return await this.batchRepository.save(batch);
  }

  async getBatchStatistics(batchId: string) {
    const refunds = await this.refundRepository.find({ where: { batchId } });
    const reviews = await this.reviewRepository.find({ where: { batchId } });

    const statusStats = refunds.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeStats = refunds.reduce((acc, r) => {
      acc[r.refundType] = (acc[r.refundType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const matchedCount = refunds.filter(r => r.isMatched).length;
    const unmatchedCount = refunds.length - matchedCount;

    return {
      totalRefunds: refunds.length,
      totalReviews: reviews.length,
      matchedCount,
      unmatchedCount,
      statusStats,
      typeStats,
      normalCount: statusStats['normal'] || 0,
      pendingReviewCount: statusStats['pending_review'] || 0,
      unprocessableCount: statusStats['unprocessable'] || 0,
    };
  }
}

export const batchService = new BatchService();
