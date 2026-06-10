import { AppDataSource } from '../data-source';
import { AuditLog, AuditAction } from '../entities/AuditLog';

const auditLogRepository = AppDataSource.getRepository(AuditLog);

export interface AuditLogInput {
  sampleId: number;
  action: AuditAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  operator: string;
  extraInfo?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<AuditLog> {
  const log = auditLogRepository.create({
    sampleId: input.sampleId,
    action: input.action,
    fieldName: input.fieldName,
    oldValue: input.oldValue,
    newValue: input.newValue,
    reason: input.reason,
    operator: input.operator,
    extraInfo: input.extraInfo,
  });
  return await auditLogRepository.save(log);
}

export async function getAuditLogsBySample(sampleId: number): Promise<AuditLog[]> {
  return await auditLogRepository.find({
    where: { sampleId },
    order: { timestamp: 'DESC' },
  });
}

export async function getAuditLogsByAction(action: AuditAction): Promise<AuditLog[]> {
  return await auditLogRepository.find({
    where: { action },
    order: { timestamp: 'DESC' },
  });
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  return await auditLogRepository.find({
    order: { timestamp: 'DESC' },
  });
}
