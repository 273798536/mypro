import { Repository } from 'typeorm';
import { AuditTrail, ActionType, EntityType } from '../entities/AuditTrail';
import { AppDataSource } from '../database';

export interface AuditLogOptions {
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  batchId?: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  private auditRepository: Repository<AuditTrail>;

  constructor() {
    this.auditRepository = AppDataSource.getRepository(AuditTrail);
  }

  async log(options: AuditLogOptions): Promise<AuditTrail> {
    const auditTrail = this.auditRepository.create({
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      batchId: options.batchId,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      operatorRole: options.operatorRole,
      fieldName: options.fieldName,
      oldValue: options.oldValue !== undefined ? JSON.stringify(options.oldValue) : undefined,
      newValue: options.newValue !== undefined ? JSON.stringify(options.newValue) : undefined,
      changeReason: options.changeReason,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      createdBy: options.operatorId,
    });

    return await this.auditRepository.save(auditTrail);
  }

  async logCreate(
    entityType: EntityType,
    entityId: string,
    newValue: any,
    options: Partial<AuditLogOptions> = {}
  ): Promise<AuditTrail> {
    return this.log({
      action: 'create',
      entityType,
      entityId,
      newValue,
      ...options,
    });
  }

  async logUpdate(
    entityType: EntityType,
    entityId: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    options: Partial<AuditLogOptions> = {}
  ): Promise<AuditTrail> {
    return this.log({
      action: 'update',
      entityType,
      entityId,
      fieldName,
      oldValue,
      newValue,
      ...options,
    });
  }

  async logDelete(
    entityType: EntityType,
    entityId: string,
    oldValue: any,
    options: Partial<AuditLogOptions> = {}
  ): Promise<AuditTrail> {
    return this.log({
      action: 'delete',
      entityType,
      entityId,
      oldValue,
      ...options,
    });
  }

  async logStatusChange(
    entityType: EntityType,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    changeReason: string,
    options: Partial<AuditLogOptions> = {}
  ): Promise<AuditTrail> {
    return this.log({
      action: 'status_change',
      entityType,
      entityId,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      changeReason,
      ...options,
    });
  }

  async getAuditTrails(
    entityType?: EntityType,
    entityId?: string,
    batchId?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: AuditTrail[]; total: number }> {
    const queryBuilder = this.auditRepository.createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', { entityId });
    }

    if (batchId) {
      queryBuilder.andWhere('audit.batchId = :batchId', { batchId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }
}

export const auditService = new AuditService();
