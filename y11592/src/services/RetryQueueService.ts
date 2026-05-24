import { Op } from 'sequelize';
import { config } from '../config';
import { RetryQueue, DeadLetterQueue } from '../models';
import {
  DataSourceType,
  RetryStatus,
  IdempotencyStrategy,
  SourceData,
  OperationType,
} from '../types';
import logger from '../utils/logger';
import { idempotencyService } from './IdempotencyService';
import { dataProcessingService } from './DataProcessingService';
import { operationLogService } from './OperationLogService';

export interface SubmitParams {
  sourceType: DataSourceType;
  sourceId: string;
  sourceData: SourceData;
  idempotencyStrategy: IdempotencyStrategy;
  submittedBy: string;
  submittedByName?: string;
  batchId?: string;
  maxAttempts?: number;
}

export interface SubmitResult {
  success: boolean;
  action: string;
  retryQueueId?: string;
  message?: string;
}

class RetryQueueService {
  async submit(params: SubmitParams): Promise<SubmitResult> {
    const {
      sourceType,
      sourceId,
      sourceData,
      idempotencyStrategy,
      submittedBy,
      submittedByName,
      batchId,
      maxAttempts,
    } = params;

    const idempotencyKey = idempotencyService.generateIdempotencyKey(
      sourceType,
      sourceId,
      batchId
    );

    const existingRecord = await idempotencyService.checkExistingRecord(idempotencyKey);

    if (existingRecord) {
      const result = await idempotencyService.applyStrategy(
        existingRecord,
        sourceData,
        idempotencyStrategy,
        submittedBy
      );

      if (result.record) {
        await operationLogService.createLog({
          entityType: 'retry_queue',
          entityId: result.record.id,
          operationType: OperationType.UPDATE,
          operatorId: submittedBy,
          operatorName: submittedByName,
          oldValues: existingRecord.toJSON(),
          newValues: result.record.toJSON(),
          remark: `幂等性处理: ${result.action}`,
          batchId,
        });
      }

      return {
        success: true,
        action: result.action,
        retryQueueId: result.record?.id,
        message: `幂等性处理: ${result.action}`,
      };
    }

    const nextAttemptAt = new Date();
    nextAttemptAt.setMinutes(nextAttemptAt.getMinutes() + config.retry.delayMinutes);

    const retryItem = await RetryQueue.create({
      sourceType,
      sourceId,
      sourceData,
      status: RetryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: maxAttempts || config.retry.maxAttempts,
      nextAttemptAt,
      idempotencyKey,
      idempotencyStrategy,
      submittedBy,
      submittedAt: new Date(),
      batchId,
    });

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: retryItem.id,
      operationType: OperationType.SUBMIT,
      operatorId: submittedBy,
      operatorName: submittedByName,
      newValues: retryItem.toJSON(),
      remark: '提交到重试队列',
      batchId,
    });

    logger.info(`数据已提交到重试队列: ${retryItem.id}`);

    return {
      success: true,
      action: 'created',
      retryQueueId: retryItem.id,
      message: '数据已提交到重试队列',
    };
  }

  async processPendingItems(): Promise<{ processed: number; success: number; failed: number }> {
    const pendingItems = await RetryQueue.findAll({
      where: {
        status: {
          [Op.in]: [RetryStatus.PENDING, RetryStatus.FAILED],
        },
        nextAttemptAt: {
          [Op.lte]: new Date(),
        },
        attemptCount: {
          [Op.lt]: config.retry.maxAttempts,
        },
      },
      limit: 100,
    });

    logger.info(`找到 ${pendingItems.length} 个待处理项`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      try {
        await this.processItem(item);
        successCount++;
      } catch (error) {
        failedCount++;
        logger.error(`处理项 ${item.id} 失败:`, error);
      }
    }

    return {
      processed: pendingItems.length,
      success: successCount,
      failed: failedCount,
    };
  }

  private async processItem(item: RetryQueue): Promise<void> {
    const oldValues = item.toJSON();

    await item.update({
      status: RetryStatus.PROCESSING,
      attemptCount: item.attemptCount + 1,
      lastAttemptAt: new Date(),
    });

    try {
      await dataProcessingService.processData(
        item.sourceType as DataSourceType,
        item.sourceData as SourceData,
        item.batchId
      );

      await item.update({
        status: RetryStatus.SUCCESS,
        lastError: null,
        errorStack: null,
      });

      await operationLogService.createLog({
        entityType: 'retry_queue',
        entityId: item.id,
        operationType: OperationType.RETRY,
        operatorId: 'system',
        oldValues,
        newValues: item.toJSON(),
        previousStatus: RetryStatus.PROCESSING,
        newStatus: RetryStatus.SUCCESS,
        remark: '处理成功',
        batchId: item.batchId,
      });

      logger.info(`处理成功: ${item.id}`);
    } catch (error: any) {
      const nextDelay = config.retry.delayMinutes * Math.pow(
        config.retry.backoffMultiplier,
        item.attemptCount
      );
      const nextAttemptAt = new Date();
      nextAttemptAt.setMinutes(nextAttemptAt.getMinutes() + nextDelay);

      if (item.attemptCount >= config.retry.maxAttempts) {
        await this.moveToDeadLetter(item, error);
      } else {
        await item.update({
          status: RetryStatus.FAILED,
          lastError: error.message,
          errorStack: error.stack,
          nextAttemptAt,
        });

        await operationLogService.createLog({
          entityType: 'retry_queue',
          entityId: item.id,
          operationType: OperationType.RETRY,
          operatorId: 'system',
          oldValues,
          newValues: item.toJSON(),
          previousStatus: RetryStatus.PROCESSING,
          newStatus: RetryStatus.FAILED,
          remark: `处理失败，下次重试: ${nextAttemptAt.toISOString()}`,
          batchId: item.batchId,
        });
      }

      throw error;
    }
  }

  private async moveToDeadLetter(item: RetryQueue, error: Error): Promise<void> {
    await DeadLetterQueue.create({
      originalRetryQueueId: item.id,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceData: item.sourceData,
      attemptCount: item.attemptCount,
      lastError: error.message,
      errorStack: error.stack,
      deadLetterReason: `超过最大重试次数 (${config.retry.maxAttempts})`,
      idempotencyKey: item.idempotencyKey,
      idempotencyStrategy: item.idempotencyStrategy,
      submittedBy: item.submittedBy,
      submittedAt: item.submittedAt,
      batchId: item.batchId,
    });

    await item.update({
      status: RetryStatus.DEAD_LETTER,
      lastError: error.message,
      errorStack: error.stack,
    });

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: item.id,
      operationType: OperationType.RETRY,
      operatorId: 'system',
      oldValues: item.toJSON(),
      newValues: item.toJSON(),
      previousStatus: RetryStatus.PROCESSING,
      newStatus: RetryStatus.DEAD_LETTER,
      remark: '移入死信队列',
      batchId: item.batchId,
    });

    logger.warn(`移入死信队列: ${item.id}`);
  }

  async cancel(id: string, operatorId: string, operatorName?: string): Promise<RetryQueue> {
    const item = await RetryQueue.findByPk(id);
    if (!item) {
      throw new Error(`重试项不存在: ${id}`);
    }

    if (item.status === RetryStatus.SUCCESS || item.status === RetryStatus.CANCELLED) {
      throw new Error(`无法取消状态为 ${item.status} 的项`);
    }

    const oldValues = item.toJSON();
    await item.update({ status: RetryStatus.CANCELLED });

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: item.id,
      operationType: OperationType.CANCEL,
      operatorId,
      operatorName,
      oldValues,
      newValues: item.toJSON(),
      previousStatus: oldValues.status,
      newStatus: RetryStatus.CANCELLED,
      remark: '人工取消',
      batchId: item.batchId,
    });

    logger.info(`取消重试项: ${id}`);
    return item;
  }

  async freeze(
    id: string,
    operatorId: string,
    reason: string,
    operatorName?: string
  ): Promise<RetryQueue> {
    const item = await RetryQueue.findByPk(id);
    if (!item) {
      throw new Error(`重试项不存在: ${id}`);
    }

    const oldValues = item.toJSON();
    await item.update({
      status: RetryStatus.FROZEN,
      frozenBy: operatorId,
      frozenAt: new Date(),
      frozenReason: reason,
    });

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: item.id,
      operationType: OperationType.FREEZE,
      operatorId,
      operatorName,
      oldValues,
      newValues: item.toJSON(),
      previousStatus: oldValues.status,
      newStatus: RetryStatus.FROZEN,
      remark: `冻结: ${reason}`,
      batchId: item.batchId,
    });

    logger.info(`冻结重试项: ${id}`);
    return item;
  }

  async unfreeze(
    id: string,
    operatorId: string,
    operatorName?: string
  ): Promise<RetryQueue> {
    const item = await RetryQueue.findByPk(id);
    if (!item) {
      throw new Error(`重试项不存在: ${id}`);
    }

    if (item.status !== RetryStatus.FROZEN) {
      throw new Error(`只能解冻状态为 frozen 的项，当前状态: ${item.status}`);
    }

    const nextAttemptAt = new Date();
    const oldValues = item.toJSON();

    await item.update({
      status: RetryStatus.PENDING,
      nextAttemptAt,
      frozenBy: null,
      frozenAt: null,
      frozenReason: null,
    });

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: item.id,
      operationType: OperationType.UNFREEZE,
      operatorId,
      operatorName,
      oldValues,
      newValues: item.toJSON(),
      previousStatus: RetryStatus.FROZEN,
      newStatus: RetryStatus.PENDING,
      remark: '解冻，重新加入队列',
      batchId: item.batchId,
    });

    logger.info(`解冻重试项: ${id}`);
    return item;
  }

  async manualDecision(
    id: string,
    operatorId: string,
    decision: 'approve' | 'reject' | 'retry',
    note: string,
    operatorName?: string
  ): Promise<RetryQueue> {
    const item = await RetryQueue.findByPk(id);
    if (!item) {
      throw new Error(`重试项不存在: ${id}`);
    }

    const oldValues = item.toJSON();
    let newStatus = item.status;

    switch (decision) {
      case 'approve':
        newStatus = RetryStatus.SUCCESS;
        await item.update({
          status: newStatus,
          manualDecisionBy: operatorId,
          manualDecisionAt: new Date(),
          manualDecisionNote: note,
        });
        break;
      case 'reject':
        newStatus = RetryStatus.CANCELLED;
        await item.update({
          status: newStatus,
          manualDecisionBy: operatorId,
          manualDecisionAt: new Date(),
          manualDecisionNote: note,
        });
        break;
      case 'retry':
        newStatus = RetryStatus.PENDING;
        await item.update({
          status: newStatus,
          attemptCount: 0,
          nextAttemptAt: new Date(),
          manualDecisionBy: operatorId,
          manualDecisionAt: new Date(),
          manualDecisionNote: note,
        });
        break;
    }

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: item.id,
      operationType: OperationType.MANUAL_DECISION,
      operatorId,
      operatorName,
      oldValues,
      newValues: item.toJSON(),
      previousStatus: oldValues.status,
      newStatus,
      remark: `人工改判: ${decision}, 备注: ${note}`,
      batchId: item.batchId,
    });

    logger.info(`人工改判 ${id}: ${decision}`);
    return item;
  }

  async getById(id: string): Promise<RetryQueue | null> {
    return RetryQueue.findByPk(id);
  }

  async getByStatus(status: RetryStatus, limit: number = 100): Promise<RetryQueue[]> {
    return RetryQueue.findAll({
      where: { status },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  async getByBatchId(batchId: string): Promise<RetryQueue[]> {
    return RetryQueue.findAll({
      where: { batchId },
      order: [['createdAt', 'DESC']],
    });
  }

  async getStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    const statuses = Object.values(RetryStatus);

    for (const status of statuses) {
      stats[status] = await RetryQueue.count({ where: { status } });
    }

    stats.deadLetterTotal = await DeadLetterQueue.count();
    stats.deadLetterResolved = await DeadLetterQueue.count({
      where: { resolvedAt: { [Op.not]: null } },
    });
    stats.deadLetterUnresolved = stats.deadLetterTotal - stats.deadLetterResolved;

    return stats;
  }
}

export const retryQueueService = new RetryQueueService();
