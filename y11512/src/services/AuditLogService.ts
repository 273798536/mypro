import { AppDataSource } from '../config/database';
import { OperationLog, OperationType, EntityType } from '../entities/OperationLog';
import { DeepPartial } from 'typeorm';

export class AuditLogService {
  private static repository = AppDataSource.getRepository(OperationLog);

  static async log(
    operationType: OperationType,
    entityType: EntityType,
    entityId: string,
    options: {
      entityNo?: string;
      beforeData?: any;
      afterData?: any;
      changes?: any;
      operatorId?: string;
      operatorName?: string;
      remark?: string;
      ipAddress?: string;
      batchId?: string;
    } = {}
  ): Promise<OperationLog> {
    const logData: DeepPartial<OperationLog> = {
      operationType,
      entityType,
      entityId,
      entityNo: options.entityNo,
      beforeData: options.beforeData,
      afterData: options.afterData,
      changes: options.changes,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      remark: options.remark,
      ipAddress: options.ipAddress,
      batchId: options.batchId
    };

    const log = this.repository.create(logData);
    return await this.repository.save(log);
  }

  static async getEntityHistory(entityType: EntityType, entityId: string): Promise<OperationLog[]> {
    return await this.repository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' }
    });
  }

  static async getBatchHistory(batchId: string): Promise<OperationLog[]> {
    return await this.repository.find({
      where: { batchId },
      order: { createdAt: 'DESC' }
    });
  }

  static async getOperatorHistory(operatorId: string, limit: number = 100): Promise<OperationLog[]> {
    return await this.repository.find({
      where: { operatorId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }
}
