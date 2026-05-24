import { UserRole } from '../types';

export const ROLE_NAMES: Record<UserRole, string> = {
  entry: '录入员',
  review: '复核员',
  supervisor: '主管',
  readonly: '只读查看'
};

export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  readonly: ['readonly'],
  entry: ['readonly', 'entry'],
  review: ['readonly', 'entry', 'review'],
  supervisor: ['readonly', 'entry', 'review', 'supervisor']
};

export interface FieldPermission {
  visible: boolean;
  editable: boolean;
}

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export const getModulePermissions = (role: UserRole): Record<string, ModulePermissions> => {
  const permissions: Record<string, ModulePermissions> = {};
  
  permissions.checkin = {
    view: true,
    create: ['entry', 'review', 'supervisor'].includes(role),
    edit: ['entry', 'review', 'supervisor'].includes(role),
    delete: ['supervisor'].includes(role),
    approve: ['review', 'supervisor'].includes(role),
    export: ['review', 'supervisor'].includes(role)
  };
  
  permissions.deposit = {
    view: true,
    create: ['entry', 'review', 'supervisor'].includes(role),
    edit: ['entry', 'review', 'supervisor'].includes(role),
    delete: ['supervisor'].includes(role),
    approve: ['review', 'supervisor'].includes(role),
    export: ['review', 'supervisor'].includes(role)
  };
  
  permissions.roomChange = {
    view: true,
    create: ['entry', 'review', 'supervisor'].includes(role),
    edit: ['entry', 'review', 'supervisor'].includes(role),
    delete: ['supervisor'].includes(role),
    approve: ['review', 'supervisor'].includes(role),
    export: ['review', 'supervisor'].includes(role)
  };
  
  permissions.shift = {
    view: true,
    create: ['entry', 'review', 'supervisor'].includes(role),
    edit: ['review', 'supervisor'].includes(role),
    delete: ['supervisor'].includes(role),
    approve: ['supervisor'].includes(role),
    export: ['review', 'supervisor'].includes(role)
  };
  
  permissions.dirty = {
    view: true,
    create: false,
    edit: ['review', 'supervisor'].includes(role),
    delete: false,
    approve: ['supervisor'].includes(role),
    export: ['review', 'supervisor'].includes(role)
  };
  
  permissions.report = {
    view: true,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: ['review', 'supervisor'].includes(role)
  };
  
  return permissions;
};

export const getCheckinFieldPermissions = (role: UserRole): Record<string, FieldPermission> => {
  const baseVisible = role !== 'readonly';
  const baseEditable = role === 'entry' || role === 'review' || role === 'supervisor';
  
  return {
    id: { visible: true, editable: false },
    sourceRowNumber: { visible: true, editable: false },
    sourceFile: { visible: true, editable: false },
    orderNo: { visible: true, editable: baseEditable },
    guestName: { visible: true, editable: baseEditable },
    idCard: { visible: ['review', 'supervisor'].includes(role), editable: ['supervisor'].includes(role) },
    roomNo: { visible: true, editable: baseEditable },
    roomType: { visible: true, editable: baseEditable },
    checkinDate: { visible: true, editable: baseEditable },
    checkoutDate: { visible: true, editable: baseEditable },
    actualCheckoutDate: { visible: true, editable: baseEditable },
    roomRate: { visible: true, editable: ['review', 'supervisor'].includes(role) },
    depositAmount: { visible: true, editable: ['review', 'supervisor'].includes(role) },
    operator: { visible: true, editable: false },
    status: { visible: true, editable: ['review', 'supervisor'].includes(role) },
    remarks: { visible: true, editable: baseEditable },
    source: { visible: true, editable: false },
    importBatch: { visible: true, editable: false },
    importedAt: { visible: true, editable: false },
    importedBy: { visible: true, editable: false }
  };
};

export const getDirtyRecordFieldPermissions = (role: UserRole): Record<string, FieldPermission> => {
  return {
    id: { visible: true, editable: false },
    recordId: { visible: true, editable: false },
    recordType: { visible: true, editable: false },
    dirtyType: { visible: true, editable: false },
    fieldName: { visible: true, editable: false },
    expectedValue: { visible: true, editable: false },
    actualValue: { visible: true, editable: false },
    description: { visible: true, editable: false },
    originalContent: { visible: true, editable: false },
    suggestion: { visible: true, editable: false },
    status: { visible: true, editable: ['review', 'supervisor'].includes(role) },
    fixedBy: { visible: true, editable: false },
    fixedAt: { visible: true, editable: false },
    fixRemark: { visible: true, editable: ['review', 'supervisor'].includes(role) },
    detectedAt: { visible: true, editable: false },
    detectedBy: { visible: true, editable: false },
    importBatch: { visible: true, editable: false }
  };
};

export const canPerformAction = (role: UserRole, action: string): boolean => {
  const roleActions: Record<UserRole, string[]> = {
    readonly: ['view', 'history'],
    entry: ['view', 'history', 'import', 'create', 'edit_own'],
    review: ['view', 'history', 'import', 'create', 'edit', 'check', 'fix', 'report', 'export'],
    supervisor: ['view', 'history', 'import', 'create', 'edit', 'delete', 'check', 'fix', 'approve', 'report', 'export', 'init', 'user_manage']
  };
  
  return roleActions[role]?.includes(action) ?? false;
};

export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) ?? false;
};
