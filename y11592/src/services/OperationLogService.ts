import { OperationLog } from '../models';
import { OperationType, DataSourceType, RetryStatus } from '../types';

export interface CreateLogParams {
  entityType: DataSourceType | 'retry_queue' | 'dead_letter_queue';
  entityId: string;
  operationType: OperationType;
  operatorId: string;
  operatorName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  previousStatus?: RetryStatus;
  newStatus?: RetryStatus;
  remark?: string;
  ipAddress?: string;
  userAgent?: string;
  batchId?: string;
}

class OperationLogService {
  async createLog(params: CreateLogParams): Promise<OperationLog> {
    const changedFields = params.changedFields || this.detectChangedFields(
      params.oldValues,
      params.newValues
    );

    return OperationLog.create({
      entityType: params.entityType,
      entityId: params.entityId,
      operationType: params.operationType,
      oldValues: params.oldValues,
      newValues: params.newValues,
      changedFields,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      remark: params.remark,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      batchId: params.batchId,
    });
  }

  private detectChangedFields(
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): string[] {
    if (!oldValues || !newValues) return [];
    
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changed.push(key);
      }
    }
    
    return changed;
  }

  async getEntityHistory(
    entityType: DataSourceType | 'retry_queue' | 'dead_letter_queue',
    entityId: string
  ): Promise<OperationLog[]> {
    return OperationLog.findAll({
      where: { entityType, entityId },
      order: [['createdAt', 'DESC']],
    });
  }

  async getBatchHistory(batchId: string): Promise<OperationLog[]> {
    return OperationLog.findAll({
      where: { batchId },
      order: [['createdAt', 'DESC']],
    });
  }

  async getOperatorHistory(
    operatorId: string,
    limit: number = 100
  ): Promise<OperationLog[]> {
    return OperationLog.findAll({
      where: { operatorId },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  async getOperationTypeHistory(
    operationType: OperationType,
    limit: number = 100
  ): Promise<OperationLog[]> {
    return OperationLog.findAll({
      where: { operationType },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }
}

export const operationLogService = new OperationLogService();
