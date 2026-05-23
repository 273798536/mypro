import { Repository } from 'typeorm';
import { LeaderRefund } from '../entities/LeaderRefund';
import { WarehouseReview } from '../entities/WarehouseReview';
import { AppDataSource } from '../database';
import { auditService } from './AuditService';
import { batchService } from './BatchService';

export interface MatchResult {
  matched: number;
  mismatched: number;
  unmatched: number;
  errors: string[];
}

export class MatchService {
  private refundRepository: Repository<LeaderRefund>;
  private reviewRepository: Repository<WarehouseReview>;

  constructor() {
    this.refundRepository = AppDataSource.getRepository(LeaderRefund);
    this.reviewRepository = AppDataSource.getRepository(WarehouseReview);
  }

  async matchBatch(batchId: string, operatorId?: string, operatorName?: string): Promise<MatchResult> {
    const result: MatchResult = {
      matched: 0,
      mismatched: 0,
      unmatched: 0,
      errors: [],
    };

    const refunds = await this.refundRepository.find({ where: { batchId } });
    const reviews = await this.reviewRepository.find({ where: { batchId } });

    for (const refund of refunds) {
      try {
        const matchedReview = reviews.find(r => 
          r.orderNo === refund.orderNo && 
          r.productSku === refund.productSku &&
          !r.isMatched
        );

        if (matchedReview) {
          await this.matchRefundAndReview(refund, matchedReview, operatorId, batchId);
          result.matched++;
        } else {
          refund.status = 'mismatched';
          refund.isMatched = false;
          refund.processRemark = '未找到匹配的仓库复核记录';
          await this.refundRepository.save(refund);
          result.unmatched++;
        }
      } catch (error: any) {
        result.errors.push(`退款单 ${refund.refundNo}: ${error.message}`);
      }
    }

    await batchService.recalculateBatchStats(batchId);

    await auditService.log({
      action: 'match',
      entityType: 'batch',
      entityId: batchId,
      batchId,
      operatorId,
      operatorName,
      changeReason: '批次数据匹配',
      newValue: JSON.stringify(result),
    });

    return result;
  }

  private async matchRefundAndReview(
    refund: LeaderRefund,
    review: WarehouseReview,
    operatorId?: string,
    batchId?: string
  ): Promise<void> {
    const isAmountMatch = Math.abs(Number(refund.refundAmount) - Number(review.compensationAmount)) < 0.01;

    refund.isMatched = true;
    refund.matchedReviewId = review.id;
    refund.matchedAmount = Number(review.compensationAmount);
    refund.diffAmount = Number(refund.refundAmount) - Number(review.compensationAmount);
    refund.updatedBy = operatorId;

    if (isAmountMatch) {
      refund.status = 'matched';
      refund.processRemark = '金额匹配成功';
    } else {
      refund.status = 'mismatched';
      refund.processRemark = `金额不匹配: 退款${refund.refundAmount} vs 补偿${review.compensationAmount}`;
    }

    await this.refundRepository.save(refund);

    review.isMatched = true;
    review.matchedRefundId = refund.id;
    review.updatedBy = operatorId;
    await this.reviewRepository.save(review);

    await auditService.log({
      action: 'match',
      entityType: 'leader_refund',
      entityId: refund.id,
      batchId,
      operatorId,
      changeReason: '匹配仓库复核记录',
      newValue: JSON.stringify({ reviewId: review.id, matched: isAmountMatch }),
    });
  }

  async updateRefundStatus(
    refundId: string,
    status: 'normal' | 'pending_review' | 'unprocessable',
    processRemark: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<LeaderRefund> {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new Error('退款记录不存在');
    }

    const oldStatus = refund.status;
    refund.status = status;
    refund.processRemark = processRemark;
    refund.updatedBy = operatorId;

    const saved = await this.refundRepository.save(refund);

    await auditService.logStatusChange('leader_refund', refundId, oldStatus, status, processRemark, {
      batchId: refund.batchId,
      operatorId,
      operatorName,
    });

    return saved;
  }

  async getRefundsByBatch(
    batchId: string,
    filters: {
      status?: string;
      refundType?: string;
      isMatched?: boolean;
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: LeaderRefund[]; total: number }> {
    const queryBuilder = this.refundRepository.createQueryBuilder('refund')
      .where('refund.batchId = :batchId', { batchId })
      .orderBy('refund.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.status) {
      queryBuilder.andWhere('refund.status = :status', { status: filters.status });
    }

    if (filters.refundType) {
      queryBuilder.andWhere('refund.refundType = :refundType', { refundType: filters.refundType });
    }

    if (filters.isMatched !== undefined) {
      queryBuilder.andWhere('refund.isMatched = :isMatched', { isMatched: filters.isMatched });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async getReviewsByBatch(
    batchId: string,
    filters: {
      reviewResult?: string;
      isMatched?: boolean;
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: WarehouseReview[]; total: number }> {
    const queryBuilder = this.reviewRepository.createQueryBuilder('review')
      .where('review.batchId = :batchId', { batchId })
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.reviewResult) {
      queryBuilder.andWhere('review.reviewResult = :reviewResult', { reviewResult: filters.reviewResult });
    }

    if (filters.isMatched !== undefined) {
      queryBuilder.andWhere('review.isMatched = :isMatched', { isMatched: filters.isMatched });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }
}

export const matchService = new MatchService();
