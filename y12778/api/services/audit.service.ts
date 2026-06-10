import type { AuditLog, AuditAction, AuditEntityType } from '../../shared/types';
import { dataStore } from '../repositories/store';

export function logAudit(params: {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  operator: string;
  details: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}): AuditLog {
  const log: AuditLog = {
    id: `audit_${Date.now().toString(36)}`,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    operator: params.operator,
    timestamp: new Date().toISOString(),
    details: params.details,
    oldValues: params.oldValues,
    newValues: params.newValues,
  };
  return dataStore.addAuditLog(log);
}

export function getEntityAuditTrail(
  entityType: AuditEntityType,
  entityId: string
): AuditLog[] {
  return dataStore.getAuditLogsByEntity(entityType, entityId).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
