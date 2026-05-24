import { ReceiptStatus, StatusTransition, AuditAction } from '../types';

export const STATUS_TRANSITIONS: StatusTransition[] = [
  {
    from: ReceiptStatus.DRAFT,
    to: ReceiptStatus.PENDING_REVIEW,
    allowedRoles: ['operator', 'supervisor', 'admin'],
    requireReason: false
  },
  {
    from: ReceiptStatus.PENDING_REVIEW,
    to: ReceiptStatus.REVIEWING,
    allowedRoles: ['reviewer', 'supervisor', 'admin'],
    requireReason: false
  },
  {
    from: ReceiptStatus.PENDING_REVIEW,
    to: ReceiptStatus.REJECTED,
    allowedRoles: ['reviewer', 'supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.REVIEWING,
    to: ReceiptStatus.FROZEN,
    allowedRoles: ['supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.REVIEWING,
    to: ReceiptStatus.SETTLED,
    allowedRoles: ['supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.REVIEWING,
    to: ReceiptStatus.REJECTED,
    allowedRoles: ['reviewer', 'supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.FROZEN,
    to: ReceiptStatus.REVIEWING,
    allowedRoles: ['supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.FROZEN,
    to: ReceiptStatus.SETTLED,
    allowedRoles: ['supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.SETTLED,
    to: ReceiptStatus.ARCHIVED,
    allowedRoles: ['admin'],
    requireReason: false
  },
  {
    from: ReceiptStatus.SETTLED,
    to: ReceiptStatus.REVIEWING,
    allowedRoles: ['admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.REJECTED,
    to: ReceiptStatus.DRAFT,
    allowedRoles: ['operator', 'supervisor', 'admin'],
    requireReason: true
  },
  {
    from: ReceiptStatus.ARCHIVED,
    to: ReceiptStatus.SETTLED,
    allowedRoles: ['admin'],
    requireReason: true
  }
];

export const getValidTransitions = (fromStatus: ReceiptStatus): StatusTransition[] => {
  return STATUS_TRANSITIONS.filter(t => t.from === fromStatus);
};

export const canTransition = (
  fromStatus: ReceiptStatus,
  toStatus: ReceiptStatus,
  userRole: string
): boolean => {
  const transition = STATUS_TRANSITIONS.find(
    t => t.from === fromStatus && t.to === toStatus
  );
  if (!transition) return false;
  return transition.allowedRoles.includes(userRole);
};

export const getRequiredReason = (
  fromStatus: ReceiptStatus,
  toStatus: ReceiptStatus
): boolean => {
  const transition = STATUS_TRANSITIONS.find(
    t => t.from === fromStatus && t.to === toStatus
  );
  return transition?.requireReason ?? false;
};

export const getStatusAction = (
  fromStatus: ReceiptStatus,
  toStatus: ReceiptStatus
): AuditAction => {
  if (toStatus === ReceiptStatus.FROZEN) return AuditAction.FREEZE;
  if (fromStatus === ReceiptStatus.FROZEN) return AuditAction.UNFREEZE;
  if (toStatus === ReceiptStatus.SETTLED) return AuditAction.SETTLE;
  if (toStatus === ReceiptStatus.ARCHIVED) return AuditAction.ARCHIVE;
  return AuditAction.STATUS_CHANGE;
};

export const STATUS_LABELS: Record<ReceiptStatus, string> = {
  [ReceiptStatus.DRAFT]: '草稿',
  [ReceiptStatus.PENDING_REVIEW]: '待复核',
  [ReceiptStatus.REVIEWING]: '复核中',
  [ReceiptStatus.FROZEN]: '已冻结',
  [ReceiptStatus.SETTLED]: '已结算',
  [ReceiptStatus.ARCHIVED]: '已归档',
  [ReceiptStatus.REJECTED]: '已驳回'
};
