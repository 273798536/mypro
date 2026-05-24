import { Op } from 'sequelize';
import { DeadLetterQueue, RetryQueue } from '../models';
import { RetryStatus, OperationType } from '../types';
import logger from '../utils/logger';
import { operationLogService } from './OperationLogService';
import { config } from '../config';

class DeadLetterQueueService {
  async getAll(limit: number = 100, offset: number = 0): Promise<{
    items: DeadLetterQueue[];
    total: number;
  }> {
    const { rows, count } = await DeadLetterQueue.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { items: rows, total: count };
  }

  async getUnresolved(limit: number = 100): Promise<DeadLetterQueue[]> {
    return DeadLetterQueue.findAll({
      where: { resolvedAt: null },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  async getById(id: string): Promise<DeadLetterQueue | null> {
    return DeadLetterQueue.findByPk(id);
  }

  async resolve(
    id: string,
    operatorId: string,
    resolution: string,
    operatorName?: string
  ): Promise<DeadLetterQueue> {
    const item = await DeadLetterQueue.findByPk(id);
    if (!item) {
      throw new Error(`死信项不存在: ${id}`);
    }

    if (item.resolvedAt) {
      throw new Error(`死信项已处理: ${id}`);
    }

    const oldValues = item.toJSON();
    await item.update({
      resolvedBy: operatorId,
      resolvedAt: new Date(),
      resolution,
    });

    await operationLogService.createLog({
      entityType: 'dead_letter_queue',
      entityId: item.id,
      operationType: OperationType.MANUAL_DECISION,
      operatorId,
      operatorName,
      oldValues,
      newValues: item.toJSON(),
      remark: `死信处理: ${resolution}`,
      batchId: item.batchId,
    });

    logger.info(`死信已处理: ${id}, 处理人: ${operatorId}`);
    return item;
  }

  async retry(
    id: string,
    operatorId: string,
    operatorName?: string
  ): Promise<RetryQueue> {
    const deadLetterItem = await DeadLetterQueue.findByPk(id);
    if (!deadLetterItem) {
      throw new Error(`死信项不存在: ${id}`);
    }

    const nextAttemptAt = new Date();
    const retryItem = await RetryQueue.create({
      sourceType: deadLetterItem.sourceType,
      sourceId: deadLetterItem.sourceId,
      sourceData: deadLetterItem.sourceData,
      status: RetryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: config.retry.maxAttempts,
      nextAttemptAt,
      idempotencyKey: deadLetterItem.idempotencyKey + '_retry_' + Date.now(),
      idempotencyStrategy: deadLetterItem.idempotencyStrategy,
      submittedBy: operatorId,
      submittedAt: new Date(),
      batchId: deadLetterItem.batchId,
    });

    await deadLetterItem.update({
      resolvedBy: operatorId,
      resolvedAt: new Date(),
      resolution: `重新提交到重试队列: ${retryItem.id}`,
    });

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: retryItem.id,
      operationType: OperationType.RETRY,
      operatorId,
      operatorName,
      newValues: retryItem.toJSON(),
      remark: `从死信队列重新提交，原死信ID: ${id}`,
      batchId: deadLetterItem.batchId,
    });

    logger.info(`死信重新提交: ${id} -> ${retryItem.id}`);
    return retryItem;
  }

  async getStatistics(): Promise<Record<string, number>> {
    const total = await DeadLetterQueue.count();
    const resolved = await DeadLetterQueue.count({
      where: { resolvedAt: { [Op.not]: null } },
    });
    const unresolved = total - resolved;

    return {
      total,
      resolved,
      unresolved,
    };
  }
}

export const deadLetterQueueService = new DeadLetterQueueService();
