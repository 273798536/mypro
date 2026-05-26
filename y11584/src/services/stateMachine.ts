import { RecordStatus, RoleType } from '../database/schema';

export type ActionType = 'submit' | 'reject' | 'confirm' | 'audit';

export interface StateTransitionRule {
  from: RecordStatus[];
  to: RecordStatus;
  allowedRoles: RoleType[];
}

export const stateTransitionMatrix: Record<ActionType, StateTransitionRule> = {
  submit: {
    from: [RecordStatus.DRAFT, RecordStatus.REJECTED],
    to: RecordStatus.SUBMITTED,
    allowedRoles: [RoleType.STORE_STAFF, RoleType.STORE_MANAGER]
  },
  reject: {
    from: [RecordStatus.DRAFT, RecordStatus.SUBMITTED, RecordStatus.CONFIRMED],
    to: RecordStatus.REJECTED,
    allowedRoles: [RoleType.STORE_MANAGER, RoleType.FINANCE, RoleType.AUDITOR]
  },
  confirm: {
    from: [RecordStatus.SUBMITTED],
    to: RecordStatus.CONFIRMED,
    allowedRoles: [RoleType.FINANCE, RoleType.AUDITOR]
  },
  audit: {
    from: [RecordStatus.CONFIRMED],
    to: RecordStatus.AUDITED,
    allowedRoles: [RoleType.FINANCE, RoleType.AUDITOR]
  }
};

export function validateStateTransition(
  action: ActionType,
  currentStatus: RecordStatus,
  operatorRole: RoleType
): { valid: boolean; error?: string } {
  const rule = stateTransitionMatrix[action];
  if (!rule) {
    return { valid: false, error: `无效的操作类型: ${action}` };
  }

  if (!rule.from.includes(currentStatus)) {
    return {
      valid: false,
      error: `状态流转不合法: 无法从 ${currentStatus} ${action} 到 ${rule.to}。允许的前置状态: ${rule.from.join(', ')}`
    };
  }

  if (!rule.allowedRoles.includes(operatorRole)) {
    return {
      valid: false,
      error: `权限不足: ${operatorRole} 无法执行 ${action} 操作。允许的角色: ${rule.allowedRoles.join(', ')}`
    };
  }

  return { valid: true };
}

export function getActionDescription(action: ActionType, currentStatus: RecordStatus): string {
  const descriptions: Record<ActionType, Record<RecordStatus, string>> = {
    submit: {
      [RecordStatus.DRAFT]: '提交审核',
      [RecordStatus.REJECTED]: '重新提交审核',
      [RecordStatus.SUBMITTED]: '',
      [RecordStatus.CONFIRMED]: '',
      [RecordStatus.AUDITED]: ''
    },
    reject: {
      [RecordStatus.DRAFT]: '驳回草稿',
      [RecordStatus.SUBMITTED]: '驳回审核',
      [RecordStatus.CONFIRMED]: '驳回已确认记录',
      [RecordStatus.REJECTED]: '',
      [RecordStatus.AUDITED]: ''
    },
    confirm: {
      [RecordStatus.SUBMITTED]: '财务确认',
      [RecordStatus.DRAFT]: '',
      [RecordStatus.REJECTED]: '',
      [RecordStatus.CONFIRMED]: '',
      [RecordStatus.AUDITED]: ''
    },
    audit: {
      [RecordStatus.CONFIRMED]: '最终审计',
      [RecordStatus.DRAFT]: '',
      [RecordStatus.SUBMITTED]: '',
      [RecordStatus.REJECTED]: '',
      [RecordStatus.AUDITED]: ''
    }
  };

  return descriptions[action]?.[currentStatus] || action;
}
