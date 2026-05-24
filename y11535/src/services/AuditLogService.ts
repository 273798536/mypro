import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities/AuditLogEntity';
import { AppDataSource } from '../database/data-source';
import { ActionType, Role } from '../types';

export class AuditLogService {
  private auditLogRepository: Repository<AuditLogEntity>;

  constructor() {
    this.auditLogRepository = AppDataSource.getRepository(AuditLogEntity);
  }

  async logAction(params: {
    userId: string;
    userName: string;
    userRole: Role;
    actionType: ActionType;
    resourceType: string;
    resourceId: string;
    ipAddress?: string;
    userAgent?: string;
    requestBody?: any;
    responseBody?: any;
    success: boolean;
    errorMessage?: string;
  }): Promise<AuditLogEntity> {
    const auditLog = this.auditLogRepository.create({
      id: uuidv4(),
      ...params,
      createdAt: new Date()
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async logPermissionDenied(params: {
    userId: string;
    userName: string;
    userRole: Role;
    actionType: ActionType;
    resourceType: string;
    resourceId: string;
    ipAddress?: string;
    userAgent?: string;
    requestBody?: any;
    requiredPermission: string;
  }): Promise<AuditLogEntity> {
    return this.logAction({
      ...params,
      success: false,
      errorMessage: `权限不足：需要 ${params.requiredPermission} 权限`
    });
  }

  async getAuditLogs(params: {
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    actionType?: ActionType;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const {
      resourceType,
      resourceId,
      userId,
      actionType,
      startTime,
      endTime,
      page = 1,
      pageSize = 50
    } = params;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('log');

    if (resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', { resourceType });
    }

    if (resourceId) {
      queryBuilder.andWhere('log.resourceId = :resourceId', { resourceId });
    }

    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (actionType) {
      queryBuilder.andWhere('log.actionType = :actionType', { actionType });
    }

    if (startTime) {
      queryBuilder.andWhere('log.createdAt >= :startTime', { startTime });
    }

    if (endTime) {
      queryBuilder.andWhere('log.createdAt <= :endTime', { endTime });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total };
  }

  async getPermissionDeniedLogs(params: {
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: AuditLogEntity[]; total: number }> {
    return this.getAuditLogs({
      ...params,
      actionType: ActionType.PERMISSION_DENIED
    });
  }
}

export const auditLogService = new AuditLogService();
