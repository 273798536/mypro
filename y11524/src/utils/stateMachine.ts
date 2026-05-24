import { LedgerStatus } from '../types';

interface StateTransition {
  from: LedgerStatus;
  to: LedgerStatus;
  allowedRoles: string[];
}

const allowedTransitions: StateTransition[] = [
  { from: LedgerStatus.DRAFT, to: LedgerStatus.SUBMITTED, allowedRoles: ['admin', 'area_manager', 'after_sales'] },
  { from: LedgerStatus.SUBMITTED, to: LedgerStatus.REJECTED, allowedRoles: ['admin', 'auditor'] },
  { from: LedgerStatus.SUBMITTED, to: LedgerStatus.SECOND_CONFIRM, allowedRoles: ['admin', 'auditor'] },
  { from: LedgerStatus.SUBMITTED, to: LedgerStatus.AUDIT_ONLY, allowedRoles: ['admin', 'auditor'] },
  { from: LedgerStatus.REJECTED, to: LedgerStatus.SUBMITTED, allowedRoles: ['admin', 'area_manager', 'after_sales'] },
  { from: LedgerStatus.REJECTED, to: LedgerStatus.AUDIT_ONLY, allowedRoles: ['admin', 'auditor'] },
  { from: LedgerStatus.SECOND_CONFIRM, to: LedgerStatus.AUDIT_ONLY, allowedRoles: ['admin', 'auditor'] },
  { from: LedgerStatus.SECOND_CONFIRM, to: LedgerStatus.REJECTED, allowedRoles: ['admin', 'auditor'] },
];

export function canTransition(from: LedgerStatus, to: LedgerStatus, role: string): boolean {
  return allowedTransitions.some(
    t => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

export function getAllowedNextStates(currentStatus: LedgerStatus, role: string): LedgerStatus[] {
  return allowedTransitions
    .filter(t => t.from === currentStatus && t.allowedRoles.includes(role))
    .map(t => t.to);
}

export function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = ['customerPhone', 'customerAddress', 'reviewerPhone', 'customerName'];
  return sensitiveFields.includes(fieldName);
}

export function maskSensitiveData(value: string, fieldName: string): string {
  if (!isSensitiveField(fieldName)) return value;
  
  if (fieldName === 'customerPhone' || fieldName === 'reviewerPhone') {
    return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  if (fieldName === 'customerName') {
    return value.length > 1 ? value[0] + '*'.repeat(value.length - 1) : value;
  }
  if (fieldName === 'customerAddress') {
    return value.replace(/(.{5}).+/, '$1***');
  }
  return value;
}
