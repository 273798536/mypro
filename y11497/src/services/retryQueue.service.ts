import dataStore from '../database/store';
import {
  ReimbursementStatus,
  RetryCategory,
  FailureReason,
  RetryQueueItem,
  User
} from '../types';
import logger from '../utils/logger';

const DEAD_LETTER_THRESHOLD = parseInt(process.env.DEAD_LETTER_THRESHOLD || '5');
const MAX_RETRY_COUNT = parseInt(process.env.MAX_RETRY_COUNT || String(DEAD_LETTER_THRESHOLD));
const RETRY_INTERVAL_MINUTES = parseInt(process.env.RETRY_INTERVAL_MINUTES || '30');

export class RetryQueueService {
  static calculateNextRetryTime(retryCount: number): string {
    const delayMinutes = RETRY_INTERVAL_MINUTES * Math.pow(2, retryCount);
    const nextTime = new Date();
    nextTime.setMinutes(nextTime.getMinutes() + delayMinutes);
    return nextTime.toISOString();
  }

  static enqueueForRetry(
    reimbursementId: string,
    category: RetryCategory,
    operator: User,
    maxRetries: number = MAX_RETRY_COUNT
  ): RetryQueueItem {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) {
      throw new Error('报销单不存在');
    }

    const nextRetryAt = this.calculateNextRetryTime(0);
    
    const queueItem = dataStore.enqueueRetry({
      reimbursementId,
      maxRetries,
      nextRetryAt,
      category
    });

    dataStore.addStatusLog(reimbursementId, {
      reimbursementId,
      fromStatus: reimbursement.status,
      toStatus: ReimbursementStatus.QUEUED,
      operatorId: operator.id,
      operatorName: operator.name,
      reason: `进入重试队列，重试分类: ${category}`
    });

    dataStore.updateReimbursement(reimbursementId, {
      status: ReimbursementStatus.QUEUED,
      currentRetry: queueItem
    });

    return queueItem;
  }

  static async processRetryQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const pendingRetries = dataStore.getPendingRetries();
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    logger.info(`开始处理重试队列，待处理数量: ${pendingRetries.length}`);

    for (const item of pendingRetries) {
      processed++;
      const result = await this.processSingleRetry(item);
      
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    logger.info(`重试队列处理完成: 处理${processed}, 成功${succeeded}, 失败${failed}`);
    return { processed, succeeded, failed };
  }

  private static async processSingleRetry(item: RetryQueueItem): Promise<{ success: boolean }> {
    const reimbursement = dataStore.getReimbursement(item.reimbursementId);
    if (!reimbursement) {
      dataStore.updateRetryQueue(item.id, { status: 'failed' });
      return { success: false };
    }

    if (reimbursement.status === ReimbursementStatus.DEAD_LETTER) {
      dataStore.updateRetryQueue(item.id, { status: 'cancelled' });
      logger.warn(`跳过死信单据的重试处理: ${item.reimbursementId}`);
      return { success: false };
    }

    if (reimbursement.status === ReimbursementStatus.CLOSED) {
      dataStore.updateRetryQueue(item.id, { status: 'cancelled' });
      logger.warn(`跳过已关闭单据的重试处理: ${item.reimbursementId}`);
      return { success: false };
    }

    if (reimbursement.status === ReimbursementStatus.COMPENSATED) {
      dataStore.updateRetryQueue(item.id, { status: 'cancelled' });
      logger.warn(`跳过已补偿单据的重试处理: ${item.reimbursementId}`);
      return { success: false };
    }

    dataStore.updateRetryQueue(item.id, {
      status: 'processing',
      retryCount: item.retryCount + 1,
      lastRetryAt: new Date().toISOString()
    });

    dataStore.addStatusLog(item.reimbursementId, {
      reimbursementId: item.reimbursementId,
      fromStatus: reimbursement.status,
      toStatus: ReimbursementStatus.RETRYING,
      operatorId: 'system',
      operatorName: '系统',
      reason: `第 ${item.retryCount + 1} 次重试，分类: ${item.category}`
    });

    dataStore.updateReimbursement(item.reimbursementId, {
      status: ReimbursementStatus.RETRYING
    });

    try {
      const validationResult = await this.validateReimbursement(reimbursement.id, item.category);
      
      if (validationResult.success) {
        return this.handleRetrySuccess(item, reimbursement);
      } else {
        return this.handleRetryFailure(item, reimbursement, validationResult.reason!);
      }
    } catch (error) {
      logger.error(`重试处理异常: ${item.id}`, error);
      return this.handleRetryFailure(item, reimbursement, error instanceof Error ? error.message : '未知错误');
    }
  }

  private static async validateReimbursement(
    reimbursementId: string,
    category: RetryCategory
  ): Promise<{ success: boolean; reason?: string }> {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) {
      return { success: false, reason: '报销单不存在' };
    }

    switch (category) {
      case RetryCategory.DUPLICATE_DETECTION:
        return this.checkDuplicates(reimbursement);
      
      case RetryCategory.MISMATCH_AMOUNT:
        return this.checkAmountMatch(reimbursement);
      
      case RetryCategory.MISSING_DOCUMENT:
        return this.checkDocuments(reimbursement);
      
      case RetryCategory.INVALID_DATA:
        return this.checkDataValidity(reimbursement);
      
      case RetryCategory.CONFLICT_RESOLUTION:
        return this.checkConflicts(reimbursement);
      
      case RetryCategory.SYSTEM_ERROR:
        return { success: true };
      
      default:
        return { success: false, reason: '未知的重试分类' };
    }
  }

  private static checkDuplicates(reimbursement: any): { success: boolean; reason?: string } {
    const duplicateItems = reimbursement.items.filter((item: any) => item.isDuplicate);
    if (duplicateItems.length > 0) {
      return {
        success: false,
        reason: `仍存在 ${duplicateItems.length} 条重复报销记录`
      };
    }
    return { success: true };
  }

  private static checkAmountMatch(reimbursement: any): { success: boolean; reason?: string } {
    const calculatedTotal = reimbursement.items.reduce((sum: number, item: any) => sum + item.amount, 0);
    if (Math.abs(calculatedTotal - reimbursement.totalAmount) > 0.01) {
      return {
        success: false,
        reason: `金额不匹配: 计算值 ${calculatedTotal} != 申报值 ${reimbursement.totalAmount}`
      };
    }
    return { success: true };
  }

  private static checkDocuments(reimbursement: any): { success: boolean; reason?: string } {
    const hasInvoice = reimbursement.materials.some((m: any) => m.source === 'invoice_pdf' && m.verified);
    const hasTravelApp = reimbursement.materials.some((m: any) => m.source === 'travel_application' && m.verified);
    
    if (!hasInvoice) {
      return { success: false, reason: '缺少已验证的发票PDF' };
    }
    if (reimbursement.travelApplicationId && !hasTravelApp) {
      return { success: false, reason: '缺少已验证的差旅申请单' };
    }
    return { success: true };
  }

  private static checkDataValidity(reimbursement: any): { success: boolean; reason?: string } {
    if (!reimbursement.applicantName || !reimbursement.department) {
      return { success: false, reason: '申请人或部门信息缺失' };
    }
    if (reimbursement.items.length === 0) {
      return { success: false, reason: '报销明细为空' };
    }
    return { success: true };
  }

  private static checkConflicts(reimbursement: any): { success: boolean; reason?: string } {
    const hasShiftRecord = reimbursement.materials.some((m: any) => m.source === 'shift_record');
    if (!hasShiftRecord) {
      return { success: false, reason: '缺少班次记录，无法验证行程冲突' };
    }
    return { success: true };
  }

  private static handleRetrySuccess(item: RetryQueueItem, reimbursement: any): { success: boolean } {
    dataStore.updateRetryQueue(item.id, { status: 'completed' });
    
    dataStore.addStatusLog(item.reimbursementId, {
      reimbursementId: item.reimbursementId,
      fromStatus: ReimbursementStatus.RETRYING,
      toStatus: ReimbursementStatus.PENDING_REVIEW,
      operatorId: 'system',
      operatorName: '系统',
      reason: `重试成功，通过 ${item.category} 验证`
    });

    dataStore.updateReimbursement(item.reimbursementId, {
      status: ReimbursementStatus.PENDING_REVIEW,
      currentRetry: undefined,
      isInSummary: true,
      failureReason: undefined,
      failureDetails: undefined
    });

    logger.info(`重试成功: ${item.reimbursementId}`);
    return { success: true };
  }

  private static handleRetryFailure(
    item: RetryQueueItem,
    reimbursement: any,
    errorReason: string
  ): { success: boolean } {
    const newRetryCount = item.retryCount + 1;
    const allRetryHistory = dataStore.getRetryQueueByReimbursement(item.reimbursementId);
    const previousHistoryRetries = allRetryHistory
      .filter(h => h.id !== item.id)
      .reduce((sum, h) => sum + h.retryCount, 0);
    const totalHistoricalRetries = previousHistoryRetries + newRetryCount;

    if (totalHistoricalRetries >= DEAD_LETTER_THRESHOLD) {
      return this.moveToDeadLetter(item, reimbursement, errorReason);
    }

    if (newRetryCount >= item.maxRetries) {
      dataStore.updateRetryQueue(item.id, {
        status: 'failed',
        lastError: errorReason
      });

      dataStore.addStatusLog(item.reimbursementId, {
        reimbursementId: item.reimbursementId,
        fromStatus: ReimbursementStatus.RETRYING,
        toStatus: ReimbursementStatus.MANUAL_INTERVENTION,
        operatorId: 'system',
        operatorName: '系统',
        reason: `本轮重试 ${newRetryCount} 次失败，累计重试 ${totalHistoricalRetries} 次，需要人工干预: ${errorReason}`
      });

      dataStore.updateReimbursement(item.reimbursementId, {
        status: ReimbursementStatus.MANUAL_INTERVENTION,
        currentRetry: undefined,
        failureReason: FailureReason.SYSTEM_ERROR,
        failureDetails: errorReason,
        isInSummary: false
      });

      logger.warn(`本轮重试次数用尽，转入人工干预: ${item.reimbursementId}, 累计重试: ${totalHistoricalRetries}/${DEAD_LETTER_THRESHOLD}`);
      return { success: false };
    }

    const nextRetryAt = this.calculateNextRetryTime(newRetryCount);
    dataStore.updateRetryQueue(item.id, {
      status: 'pending',
      nextRetryAt,
      lastError: errorReason
    });

    dataStore.addStatusLog(item.reimbursementId, {
      reimbursementId: item.reimbursementId,
      fromStatus: ReimbursementStatus.RETRYING,
      toStatus: ReimbursementStatus.QUEUED,
      operatorId: 'system',
      operatorName: '系统',
      reason: `第 ${newRetryCount} 次重试失败，累计重试 ${totalHistoricalRetries} 次，下次重试时间: ${nextRetryAt}，原因: ${errorReason}`
    });

    dataStore.updateReimbursement(item.reimbursementId, {
      status: ReimbursementStatus.QUEUED
    });

    logger.info(`重试失败，安排下次重试: ${item.reimbursementId}, 下次时间: ${nextRetryAt}, 累计重试: ${totalHistoricalRetries}/${DEAD_LETTER_THRESHOLD}`);
    return { success: false };
  }

  private static moveToDeadLetter(
    item: RetryQueueItem,
    reimbursement: any,
    errorReason: string
  ): { success: boolean } {
    const retryHistory = dataStore.getRetryQueueByReimbursement(item.reimbursementId);
    
    const failureReason = this.mapCategoryToFailureReason(item.category);
    
    dataStore.moveToDeadLetter(
      item.reimbursementId,
      failureReason,
      errorReason,
      retryHistory
    );

    dataStore.updateRetryQueue(item.id, { status: 'failed', lastError: errorReason });

    logger.error(`移入死信队列: ${item.reimbursementId}, 原因: ${errorReason}`);
    return { success: false };
  }

  private static mapCategoryToFailureReason(category: RetryCategory): FailureReason {
    const mapping: Record<RetryCategory, FailureReason> = {
      [RetryCategory.DUPLICATE_DETECTION]: FailureReason.DUPLICATE_ACCOMMODATION,
      [RetryCategory.MISMATCH_AMOUNT]: FailureReason.AMOUNT_MISMATCH,
      [RetryCategory.MISSING_DOCUMENT]: FailureReason.MISSING_APPROVAL,
      [RetryCategory.INVALID_DATA]: FailureReason.INVOICE_INVALID,
      [RetryCategory.SYSTEM_ERROR]: FailureReason.SYSTEM_ERROR,
      [RetryCategory.CONFLICT_RESOLUTION]: FailureReason.TRAVEL_CONFLICT
    };
    return mapping[category] || FailureReason.SYSTEM_ERROR;
  }

  static manualRetry(reimbursementId: string, operator: User): RetryQueueItem {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) {
      throw new Error('报销单不存在');
    }

    const allRetryHistory = dataStore.getRetryQueueByReimbursement(reimbursementId);
    const totalHistoricalRetries = allRetryHistory.reduce((sum, h) => sum + h.retryCount, 0);
    const remainingRetries = Math.max(1, DEAD_LETTER_THRESHOLD - totalHistoricalRetries);
    const category = reimbursement.currentRetry?.category || RetryCategory.SYSTEM_ERROR;
    
    logger.info(`人工重试: ${reimbursementId}, 历史重试: ${totalHistoricalRetries}, 剩余可用: ${remainingRetries}`);
    
    return this.enqueueForRetry(
      reimbursementId,
      category,
      operator,
      remainingRetries
    );
  }

  static testEnqueueAndFail(
    reimbursementId: string,
    category: RetryCategory,
    errorReason: string,
    operator: User
  ): {
    success: boolean;
    status: string;
    retryCount: number;
    totalRetries: number;
    message: string;
  } {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) {
      throw new Error('报销单不存在');
    }

    const queueItem = this.enqueueForRetry(reimbursementId, category, operator);

    const allRetryHistory = dataStore.getRetryQueueByReimbursement(reimbursementId);
    const previousHistoryRetries = allRetryHistory
      .filter(h => h.id !== queueItem.id)
      .reduce((sum, h) => sum + h.retryCount, 0);
    
    let currentRetryCount = 0;
    let totalRetries = previousHistoryRetries;
    let finalStatus = '';

    for (let i = 0; i < queueItem.maxRetries; i++) {
      currentRetryCount = i + 1;
      totalRetries = previousHistoryRetries + currentRetryCount;

      dataStore.updateRetryQueue(queueItem.id, {
        retryCount: currentRetryCount,
        status: 'processing'
      });

      if (totalRetries >= DEAD_LETTER_THRESHOLD) {
        this.moveToDeadLetter(
          { ...queueItem, retryCount: currentRetryCount },
          reimbursement,
          errorReason
        );
        finalStatus = 'dead_letter';
        return {
          success: false,
          status: finalStatus,
          retryCount: currentRetryCount,
          totalRetries,
          message: `累计重试 ${totalRetries} 次，达到死信阈值 ${DEAD_LETTER_THRESHOLD}，已移入死信队列`
        };
      }
    }

    dataStore.updateRetryQueue(queueItem.id, {
      status: 'failed',
      retryCount: currentRetryCount,
      lastError: errorReason
    });

    dataStore.addStatusLog(reimbursementId, {
      reimbursementId,
      fromStatus: ReimbursementStatus.RETRYING,
      toStatus: ReimbursementStatus.MANUAL_INTERVENTION,
      operatorId: 'system',
      operatorName: '系统',
      reason: `本轮重试 ${currentRetryCount} 次失败，累计重试 ${totalRetries} 次，需要人工干预: ${errorReason}`
    });

    dataStore.updateReimbursement(reimbursementId, {
      status: ReimbursementStatus.MANUAL_INTERVENTION,
      currentRetry: undefined,
      failureReason: this.mapCategoryToFailureReason(category),
      failureDetails: errorReason,
      isInSummary: false
    });

    finalStatus = 'manual_intervention';
    return {
      success: false,
      status: finalStatus,
      retryCount: currentRetryCount,
      totalRetries,
      message: `本轮重试 ${currentRetryCount} 次失败，累计重试 ${totalRetries} 次，转入人工干预`
    };
  }
}
