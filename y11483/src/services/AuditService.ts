import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  StatusAuditLog,
  EntityType,
  OperationType,
} from '../entities';

export interface AuditLogInput {
  entityId: string;
  entityType: EntityType;
  entityNo?: string;
  operationType: OperationType;
  operator: string;
  reason: string;
  oldStatus?: string;
  newStatus?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export class AuditService {
  private logRepository: Repository<StatusAuditLog>;

  constructor() {
    this.logRepository = AppDataSource.getRepository(StatusAuditLog);
  }

  async log(input: AuditLogInput): Promise<StatusAuditLog> {
    const log = this.logRepository.create({
      ...input,
      operationTime: new Date(),
    });
    return await this.logRepository.save(log);
  }

  async logCreate(
    entityId: string,
    entityType: EntityType,
    entityNo: string,
    operator: string,
    newData: Record<string, any>,
    requestId?: string
  ): Promise<StatusAuditLog> {
    return this.log({
      entityId,
      entityType,
      entityNo,
      operationType: OperationType.CREATE,
      operator,
      reason: '创建新记录',
      newData,
      requestId,
    });
  }

  async logUpdate(
    entityId: string,
    entityType: EntityType,
    entityNo: string,
    operator: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    changedFields: string[],
    reason: string = '更新记录',
    requestId?: string
  ): Promise<StatusAuditLog> {
    return this.log({
      entityId,
      entityType,
      entityNo,
      operationType: OperationType.UPDATE,
      operator,
      reason,
      oldData,
      newData,
      changedFields,
      requestId,
    });
  }

  async logStatusChange(
    entityId: string,
    entityType: EntityType,
    entityNo: string,
    operationType: OperationType,
    operator: string,
    oldStatus: string,
    newStatus: string,
    reason: string,
    requestId?: string
  ): Promise<StatusAuditLog> {
    return this.log({
      entityId,
      entityType,
      entityNo,
      operationType,
      operator,
      oldStatus,
      newStatus,
      reason,
      requestId,
    });
  }

  async getEntityHistory(
    entityId: string,
    entityType: EntityType
  ): Promise<StatusAuditLog[]> {
    return this.logRepository.find({
      where: { entityId, entityType },
      order: { operationTime: 'DESC' },
    });
  }

  async getEntityHistoryByNo(
    entityNo: string,
    entityType: EntityType
  ): Promise<StatusAuditLog[]> {
    return this.logRepository.find({
      where: { entityNo, entityType },
      order: { operationTime: 'DESC' },
    });
  }

  async getHistoryByOperator(
    operator: string,
    limit: number = 100
  ): Promise<StatusAuditLog[]> {
    return this.logRepository.find({
      where: { operator },
      order: { operationTime: 'DESC' },
      take: limit,
    });
  }

  async getOperationHistory(
    operationType: OperationType,
    limit: number = 100
  ): Promise<StatusAuditLog[]> {
    return this.logRepository.find({
      where: { operationType },
      order: { operationTime: 'DESC' },
      take: limit,
    });
  }
}