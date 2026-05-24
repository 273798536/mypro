import { AuditLog } from '../models';
import { AuditAction, DataSource, QueueStatus, RetryCategory } from '../models/types';

interface CreateAuditLogParams {
  action: AuditAction;
  source: DataSource;
  recordType: string;
  recordId?: number;
  recordNo?: string;
  queueId?: number;
  queueNo?: string;
  oldStatus?: QueueStatus;
  newStatus?: QueueStatus;
  retryCategory?: RetryCategory;
  beforeData?: any;
  afterData?: any;
  changeReason?: string;
  operatorId?: number;
  operatorName?: string;
  operatorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  remark?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<AuditLog> {
  const logNo = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return AuditLog.create({
    logNo,
    action: params.action,
    source: params.source,
    recordType: params.recordType,
    recordId: params.recordId,
    recordNo: params.recordNo,
    queueId: params.queueId,
    queueNo: params.queueNo,
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    retryCategory: params.retryCategory,
    beforeData: params.beforeData,
    afterData: params.afterData,
    changeReason: params.changeReason,
    operatorId: params.operatorId,
    operatorName: params.operatorName,
    operatorRole: params.operatorRole,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    remark: params.remark
  });
}

export async function getAuditLogs(filters: {
  queueId?: number;
  recordId?: number;
  action?: AuditAction;
  operatorId?: number;
  startTime?: Date;
  endTime?: Date;
}): Promise<AuditLog[]> {
  const where: any = {};
  
  if (filters.queueId) where.queueId = filters.queueId;
  if (filters.recordId) where.recordId = filters.recordId;
  if (filters.action) where.action = filters.action;
  if (filters.operatorId) where.operatorId = filters.operatorId;
  if (filters.startTime && filters.endTime) {
    where.createdAt = {
      $between: [filters.startTime, filters.endTime]
    };
  }
  
  return AuditLog.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });
}
