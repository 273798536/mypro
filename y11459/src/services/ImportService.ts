import { Repository } from 'typeorm';
import { LeaderRefund, RefundType, RefundStatus } from '../entities/LeaderRefund';
import { WarehouseReview, ReviewResult } from '../entities/WarehouseReview';
import { ImportStrategy } from '../entities/Batch';
import { AppDataSource } from '../database';
import { auditService } from './AuditService';
import { batchService } from './BatchService';

export interface LeaderRefundImportData {
  refundNo: string;
  orderNo: string;
  leaderId: string;
  leaderName: string;
  leaderPhone: string;
  userId: string;
  userName: string;
  userPhone: string;
  refundType: RefundType;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  refundReason: string;
}

export interface WarehouseReviewImportData {
  reviewNo: string;
  orderNo: string;
  warehouseCode: string;
  warehouseName: string;
  reviewerId: string;
  reviewerName: string;
  productSku: string;
  productName: string;
  actualQuantity: number;
  shouldQuantity: number;
  compensationAmount: number;
  reviewResult: ReviewResult;
  reviewRemark?: string;
  reviewedAt: Date;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  ignored: number;
  failed: number;
  errors: string[];
}

export class ImportService {
  private refundRepository: Repository<LeaderRefund>;
  private reviewRepository: Repository<WarehouseReview>;

  constructor() {
    this.refundRepository = AppDataSource.getRepository(LeaderRefund);
    this.reviewRepository = AppDataSource.getRepository(WarehouseReview);
  }

  async importLeaderRefunds(
    batchId: string,
    data: LeaderRefundImportData[],
    strategy: ImportStrategy,
    operatorId?: string,
    operatorName?: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      ignored: 0,
      failed: 0,
      errors: [],
    };

    for (const item of data) {
      try {
        const existing = await this.refundRepository.findOne({
          where: { refundNo: item.refundNo, batchId },
        });

        if (existing) {
          switch (strategy) {
            case 'ignore':
              result.ignored++;
              break;
            case 'overwrite':
              await this.updateRefund(existing, item, operatorId, batchId);
              result.updated++;
              break;
            case 'append':
              result.ignored++;
              break;
          }
        } else {
          await this.createRefund(batchId, item, operatorId);
          result.imported++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(`退款单 ${item.refundNo}: ${error.message}`);
      }
    }

    await batchService.recalculateBatchStats(batchId);

    await auditService.log({
      action: 'import',
      entityType: 'leader_refund',
      entityId: batchId,
      batchId,
      operatorId,
      operatorName,
      changeReason: `导入退款数据，策略: ${strategy}`,
      newValue: JSON.stringify(result),
    });

    return result;
  }

  async importWarehouseReviews(
    batchId: string,
    data: WarehouseReviewImportData[],
    strategy: ImportStrategy,
    operatorId?: string,
    operatorName?: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      ignored: 0,
      failed: 0,
      errors: [],
    };

    for (const item of data) {
      try {
        const existing = await this.reviewRepository.findOne({
          where: { reviewNo: item.reviewNo, batchId },
        });

        if (existing) {
          switch (strategy) {
            case 'ignore':
              result.ignored++;
              break;
            case 'overwrite':
              await this.updateReview(existing, item, operatorId, batchId);
              result.updated++;
              break;
            case 'append':
              result.ignored++;
              break;
          }
        } else {
          await this.createReview(batchId, item, operatorId);
          result.imported++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(`复核单 ${item.reviewNo}: ${error.message}`);
      }
    }

    await batchService.recalculateBatchStats(batchId);

    await auditService.log({
      action: 'import',
      entityType: 'warehouse_review',
      entityId: batchId,
      batchId,
      operatorId,
      operatorName,
      changeReason: `导入复核数据，策略: ${strategy}`,
      newValue: JSON.stringify(result),
    });

    return result;
  }

  private async createRefund(
    batchId: string,
    data: LeaderRefundImportData,
    operatorId?: string
  ): Promise<LeaderRefund> {
    const refund = this.refundRepository.create({
      ...data,
      batchId,
      status: 'pending_review' as RefundStatus,
      isMatched: false,
      createdBy: operatorId,
      updatedBy: operatorId,
    });

    const saved = await this.refundRepository.save(refund);

    await auditService.logCreate('leader_refund', saved.id, saved, {
      batchId,
      operatorId,
    });

    return saved;
  }

  private async updateRefund(
    existing: LeaderRefund,
    data: LeaderRefundImportData,
    operatorId?: string,
    batchId?: string
  ): Promise<LeaderRefund> {
    const oldData = { ...existing };
    const updated = this.refundRepository.merge(existing, {
      ...data,
      updatedBy: operatorId,
    });

    const saved = await this.refundRepository.save(updated);

    for (const key of Object.keys(data)) {
      if (oldData[key as keyof LeaderRefundImportData] !== data[key as keyof LeaderRefundImportData]) {
        await auditService.logUpdate('leader_refund', saved.id, key, oldData[key], data[key], {
          batchId,
          operatorId,
        });
      }
    }

    return saved;
  }

  private async createReview(
    batchId: string,
    data: WarehouseReviewImportData,
    operatorId?: string
  ): Promise<WarehouseReview> {
    const review = this.reviewRepository.create({
      ...data,
      batchId,
      diffQuantity: data.shouldQuantity - data.actualQuantity,
      isMatched: false,
      createdBy: operatorId,
      updatedBy: operatorId,
    });

    const saved = await this.reviewRepository.save(review);

    await auditService.logCreate('warehouse_review', saved.id, saved, {
      batchId,
      operatorId,
    });

    return saved;
  }

  private async updateReview(
    existing: WarehouseReview,
    data: WarehouseReviewImportData,
    operatorId?: string,
    batchId?: string
  ): Promise<WarehouseReview> {
    const oldData = { ...existing };
    const updated = this.reviewRepository.merge(existing, {
      ...data,
      diffQuantity: data.shouldQuantity - data.actualQuantity,
      updatedBy: operatorId,
    });

    const saved = await this.reviewRepository.save(updated);

    for (const key of Object.keys(data)) {
      if (oldData[key as keyof WarehouseReviewImportData] !== data[key as keyof WarehouseReviewImportData]) {
        await auditService.logUpdate('warehouse_review', saved.id, key, oldData[key], data[key], {
          batchId,
          operatorId,
        });
      }
    }

    return saved;
  }
}

export const importService = new ImportService();
