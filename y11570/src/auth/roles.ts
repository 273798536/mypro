export enum Role {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  MANAGER = 'manager',
  QUALITY = 'quality',
  FINANCE = 'finance',
  ADMIN = 'admin'
}

export enum Permission {
  TICKET_VIEW = 'ticket:view',
  TICKET_REASSIGN = 'ticket:reassign',
  TICKET_ESCALATE = 'ticket:escalate',
  TICKET_COMPENSATION_REQUEST = 'ticket:compensation:request',
  TICKET_COMPENSATION_REVIEW = 'ticket:compensation:review',
  TICKET_FREEZE = 'ticket:freeze',
  TICKET_UNFREEZE = 'ticket:unfreeze',
  TICKET_SETTLE = 'ticket:settle',
  TICKET_ARCHIVE = 'ticket:archive',
  TICKET_UNARCHIVE = 'ticket:unarchive',
  TICKET_REVIEW = 'ticket:review',
  TICKET_OVERRIDE = 'ticket:override',

  BATCH_VIEW = 'batch:view',
  BATCH_CREATE = 'batch:create',
  BATCH_SUBMIT = 'batch:submit',
  BATCH_REVIEW = 'batch:review',
  BATCH_PROCESS = 'batch:process',
  BATCH_FREEZE = 'batch:freeze',
  BATCH_ARCHIVE = 'batch:archive',
  BATCH_UNARCHIVE = 'batch:unarchive',

  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_CREATE = 'inventory:create',
  INVENTORY_EDIT = 'inventory:edit',

  EXPORT_VIEW = 'export:view',
  EXPORT_CREATE = 'export:create',

  REPORT_VIEW = 'report:view',
  REPORT_CREATE = 'report:create',

  AUDIT_VIEW = 'audit:view',
  FAILED_VIEW = 'failed:view',

  SLA_MANAGE = 'sla:manage',
  COMPENSATION_RULE_MANAGE = 'compensation:rule:manage'
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.AGENT]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_REASSIGN,
    Permission.TICKET_COMPENSATION_REQUEST,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_CREATE,
    Permission.BATCH_VIEW,
    Permission.EXPORT_VIEW,
    Permission.REPORT_VIEW,
    Permission.AUDIT_VIEW
  ],

  [Role.SUPERVISOR]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_REASSIGN,
    Permission.TICKET_ESCALATE,
    Permission.TICKET_COMPENSATION_REQUEST,
    Permission.TICKET_COMPENSATION_REVIEW,
    Permission.TICKET_FREEZE,
    Permission.TICKET_SETTLE,
    Permission.TICKET_REVIEW,
    Permission.BATCH_VIEW,
    Permission.BATCH_CREATE,
    Permission.BATCH_SUBMIT,
    Permission.BATCH_REVIEW,
    Permission.BATCH_PROCESS,
    Permission.BATCH_FREEZE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_CREATE,
    Permission.INVENTORY_EDIT,
    Permission.EXPORT_VIEW,
    Permission.EXPORT_CREATE,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.AUDIT_VIEW,
    Permission.FAILED_VIEW
  ],

  [Role.MANAGER]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_REASSIGN,
    Permission.TICKET_ESCALATE,
    Permission.TICKET_COMPENSATION_REQUEST,
    Permission.TICKET_COMPENSATION_REVIEW,
    Permission.TICKET_FREEZE,
    Permission.TICKET_UNFREEZE,
    Permission.TICKET_SETTLE,
    Permission.TICKET_ARCHIVE,
    Permission.TICKET_UNARCHIVE,
    Permission.TICKET_REVIEW,
    Permission.TICKET_OVERRIDE,
    Permission.BATCH_VIEW,
    Permission.BATCH_CREATE,
    Permission.BATCH_SUBMIT,
    Permission.BATCH_REVIEW,
    Permission.BATCH_PROCESS,
    Permission.BATCH_FREEZE,
    Permission.BATCH_ARCHIVE,
    Permission.BATCH_UNARCHIVE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_CREATE,
    Permission.INVENTORY_EDIT,
    Permission.EXPORT_VIEW,
    Permission.EXPORT_CREATE,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.AUDIT_VIEW,
    Permission.FAILED_VIEW,
    Permission.SLA_MANAGE,
    Permission.COMPENSATION_RULE_MANAGE
  ],

  [Role.QUALITY]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_FREEZE,
    Permission.TICKET_UNFREEZE,
    Permission.TICKET_REVIEW,
    Permission.TICKET_OVERRIDE,
    Permission.BATCH_VIEW,
    Permission.BATCH_REVIEW,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_EDIT,
    Permission.EXPORT_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.AUDIT_VIEW,
    Permission.FAILED_VIEW
  ],

  [Role.FINANCE]: [
    Permission.TICKET_VIEW,
    Permission.TICKET_COMPENSATION_REVIEW,
    Permission.TICKET_SETTLE,
    Permission.BATCH_VIEW,
    Permission.BATCH_REVIEW,
    Permission.BATCH_PROCESS,
    Permission.INVENTORY_VIEW,
    Permission.EXPORT_VIEW,
    Permission.EXPORT_CREATE,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.AUDIT_VIEW
  ],

  [Role.ADMIN]: Object.values(Permission)
};

export const DEFAULT_ROLE_FOR_OPERATOR: Record<string, Role> = {
  'AGENT001': Role.AGENT,
  'AGENT002': Role.AGENT,
  'AGENT003': Role.AGENT,
  'AGENT_SUPERVISOR': Role.SUPERVISOR,
  'MANAGER001': Role.MANAGER,
  'QUALITY_TEAM': Role.QUALITY,
  'FINANCE001': Role.FINANCE,
  'WAREHOUSE001': Role.AGENT,
  'admin_001': Role.ADMIN,
  'admin': Role.ADMIN,
  'system': Role.ADMIN
};

export function getRoleForOperator(operatorId: string): Role {
  return DEFAULT_ROLE_FOR_OPERATOR[operatorId] || Role.AGENT;
}

export function hasPermission(operatorId: string, permission: Permission): boolean {
  const role = getRoleForOperator(operatorId);
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function getPermissionsForOperator(operatorId: string): Permission[] {
  const role = getRoleForOperator(operatorId);
  return ROLE_PERMISSIONS[role] || [];
}

export function checkPermission(operatorId: string, permission: Permission): { allowed: boolean; message?: string } {
  if (hasPermission(operatorId, permission)) {
    return { allowed: true };
  }
  const role = getRoleForOperator(operatorId);
  return {
    allowed: false,
    message: `操作人 [${operatorId}] 角色为 [${role}]，缺少权限 [${permission}]`
  };
}

export default {
  Role,
  Permission,
  ROLE_PERMISSIONS,
  DEFAULT_ROLE_FOR_OPERATOR,
  getRoleForOperator,
  hasPermission,
  getPermissionsForOperator,
  checkPermission
};
