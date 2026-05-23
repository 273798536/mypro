import { UserRole, MaterialRecord, DirtyRecord, StateChange } from '../types';

interface FieldPermission {
  visible: string[];
  editable: string[];
}

interface ActionPermission {
  [action: string]: boolean;
}

const ROLE_FIELD_PERMISSIONS: Record<UserRole, FieldPermission> = {
  [UserRole.DATA_ENTRY]: {
    visible: [
      'id', 'source', 'sourceLine', 'sourceFile', 'batchNumber', 'materialName',
      'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
      'patientId', 'patientName', 'appointmentDate', 'invoiceNumber',
      'importDate', 'importedBy', 'status', 'createdAt'
    ],
    editable: [
      'batchNumber', 'materialName', 'materialType', 'quantity', 'unitPrice',
      'totalAmount', 'supplier', 'patientId', 'patientName', 'appointmentDate',
      'invoiceNumber'
    ]
  },
  [UserRole.REVIEWER]: {
    visible: [
      'id', 'source', 'sourceLine', 'sourceFile', 'batchNumber', 'materialName',
      'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
      'patientId', 'patientName', 'appointmentDate', 'invoiceNumber',
      'importDate', 'importedBy', 'status', 'createdAt', 'updatedAt', 'rawData'
    ],
    editable: [
      'status'
    ]
  },
  [UserRole.SUPERVISOR]: {
    visible: [
      'id', 'source', 'sourceLine', 'sourceFile', 'batchNumber', 'materialName',
      'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
      'patientId', 'patientName', 'appointmentDate', 'invoiceNumber',
      'importDate', 'importedBy', 'status', 'createdAt', 'updatedAt', 'rawData'
    ],
    editable: [
      'batchNumber', 'materialName', 'materialType', 'quantity', 'unitPrice',
      'totalAmount', 'supplier', 'patientId', 'patientName', 'appointmentDate',
      'invoiceNumber', 'status'
    ]
  },
  [UserRole.READ_ONLY]: {
    visible: [
      'id', 'source', 'sourceLine', 'batchNumber', 'materialName',
      'materialType', 'quantity', 'unitPrice', 'totalAmount', 'supplier',
      'status', 'createdAt'
    ],
    editable: []
  }
};

const ROLE_ACTION_PERMISSIONS: Record<UserRole, ActionPermission> = {
  [UserRole.DATA_ENTRY]: {
    init: false,
    import: true,
    check: true,
    fix: true,
    review: false,
    approve: false,
    reject: false,
    report: true,
    history: true,
    export: true,
    createUser: false,
    manageUsers: false
  },
  [UserRole.REVIEWER]: {
    init: false,
    import: false,
    check: true,
    fix: false,
    review: true,
    approve: false,
    reject: true,
    report: true,
    history: true,
    export: true,
    createUser: false,
    manageUsers: false
  },
  [UserRole.SUPERVISOR]: {
    init: true,
    import: true,
    check: true,
    fix: true,
    review: true,
    approve: true,
    reject: true,
    report: true,
    history: true,
    export: true,
    createUser: true,
    manageUsers: true
  },
  [UserRole.READ_ONLY]: {
    init: false,
    import: false,
    check: false,
    fix: false,
    review: false,
    approve: false,
    reject: false,
    report: true,
    history: true,
    export: false,
    createUser: false,
    manageUsers: false
  }
};

export function canPerformAction(role: UserRole, action: string): boolean {
  return ROLE_ACTION_PERMISSIONS[role]?.[action] ?? false;
}

export function canViewField(role: UserRole, field: string): boolean {
  return ROLE_FIELD_PERMISSIONS[role]?.visible.includes(field) ?? false;
}

export function canEditField(role: UserRole, field: string): boolean {
  return ROLE_FIELD_PERMISSIONS[role]?.editable.includes(field) ?? false;
}

export function filterRecordByRole(
  record: MaterialRecord,
  role: UserRole
): Partial<MaterialRecord> {
  const visibleFields = ROLE_FIELD_PERMISSIONS[role]?.visible ?? [];
  const filtered: Partial<MaterialRecord> = {};
  
  for (const field of visibleFields) {
    if (field in record) {
      (filtered as any)[field] = (record as any)[field];
    }
  }
  
  return filtered;
}

export function filterRecordsByRole(
  records: MaterialRecord[],
  role: UserRole
): Partial<MaterialRecord>[] {
  return records.map(r => filterRecordByRole(r, role));
}

export function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.DATA_ENTRY]: '录入员',
    [UserRole.REVIEWER]: '复核员',
    [UserRole.SUPERVISOR]: '主管',
    [UserRole.READ_ONLY]: '只读查看'
  };
  return names[role] ?? role;
}

export function assertPermission(role: UserRole, action: string): void {
  if (!canPerformAction(role, action)) {
    throw new Error(`权限不足：角色 "${getRoleName(role)}" 无法执行操作 "${action}"`);
  }
}
