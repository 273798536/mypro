import { PermissionConfig, Role } from '../types';

const ALL_FIELDS = [
  'id', 'orderNo', 'customerName', 'phone', 'address', 'applianceType',
  'appointmentDate', 'appointmentTime', 'technicianId', 'technicianName',
  'status', 'rating', 'reviewContent', 'badReason', 'reviewDate',
  'checkinTime', 'checkoutTime', 'location', 'latitude', 'longitude',
  'originalAmount', 'adjustedAmount', 'adjustmentReason', 'operator', 'adjustmentDate',
  'source', 'rawRow', 'sourceFile',
];

export const permissionConfig: PermissionConfig = {
  entry: {
    fields: {
      id: { visible: true, editable: false },
      orderNo: { visible: true, editable: true },
      customerName: { visible: true, editable: true },
      phone: { visible: true, editable: true },
      address: { visible: true, editable: true },
      applianceType: { visible: true, editable: true },
      appointmentDate: { visible: true, editable: true },
      appointmentTime: { visible: true, editable: true },
      technicianId: { visible: true, editable: true },
      technicianName: { visible: true, editable: true },
      status: { visible: true, editable: false },
      checkinTime: { visible: true, editable: false },
      checkoutTime: { visible: true, editable: false },
      location: { visible: true, editable: false },
      latitude: { visible: true, editable: false },
      longitude: { visible: true, editable: false },
      rating: { visible: true, editable: false },
      reviewContent: { visible: true, editable: false },
      badReason: { visible: true, editable: false },
      reviewDate: { visible: true, editable: false },
      originalAmount: { visible: false, editable: false },
      adjustedAmount: { visible: false, editable: false },
      adjustmentReason: { visible: false, editable: false },
      operator: { visible: false, editable: false },
      adjustmentDate: { visible: false, editable: false },
      source: { visible: true, editable: false },
      rawRow: { visible: true, editable: false },
      sourceFile: { visible: true, editable: false },
    },
    actions: ['import', 'view', 'fix_dirty'],
  },
  review: {
    fields: {
      id: { visible: true, editable: false },
      orderNo: { visible: true, editable: false },
      customerName: { visible: true, editable: false },
      phone: { visible: true, editable: false },
      address: { visible: true, editable: false },
      applianceType: { visible: true, editable: false },
      appointmentDate: { visible: true, editable: false },
      appointmentTime: { visible: true, editable: false },
      technicianId: { visible: true, editable: false },
      technicianName: { visible: true, editable: false },
      status: { visible: true, editable: true },
      checkinTime: { visible: true, editable: false },
      checkoutTime: { visible: true, editable: false },
      location: { visible: true, editable: false },
      latitude: { visible: true, editable: false },
      longitude: { visible: true, editable: false },
      rating: { visible: true, editable: false },
      reviewContent: { visible: true, editable: false },
      badReason: { visible: true, editable: true },
      reviewDate: { visible: true, editable: false },
      originalAmount: { visible: true, editable: false },
      adjustedAmount: { visible: true, editable: false },
      adjustmentReason: { visible: true, editable: false },
      operator: { visible: true, editable: false },
      adjustmentDate: { visible: true, editable: false },
      source: { visible: true, editable: false },
      rawRow: { visible: true, editable: false },
      sourceFile: { visible: true, editable: false },
    },
    actions: ['view', 'approve', 'reject', 'report'],
  },
  supervisor: {
    fields: Object.fromEntries(
      ALL_FIELDS.map(f => [f, { visible: true, editable: true }])
    ) as any,
    actions: ['import', 'view', 'fix_dirty', 'approve', 'reject', 'report', 'export', 'history', 'manage_users'],
  },
  readonly: {
    fields: {
      id: { visible: true, editable: false },
      orderNo: { visible: true, editable: false },
      customerName: { visible: true, editable: false },
      phone: { visible: false, editable: false },
      address: { visible: true, editable: false },
      applianceType: { visible: true, editable: false },
      appointmentDate: { visible: true, editable: false },
      appointmentTime: { visible: true, editable: false },
      technicianId: { visible: true, editable: false },
      technicianName: { visible: true, editable: false },
      status: { visible: true, editable: false },
      checkinTime: { visible: true, editable: false },
      checkoutTime: { visible: true, editable: false },
      location: { visible: true, editable: false },
      latitude: { visible: true, editable: false },
      longitude: { visible: true, editable: false },
      rating: { visible: true, editable: false },
      reviewContent: { visible: true, editable: false },
      badReason: { visible: true, editable: false },
      reviewDate: { visible: true, editable: false },
      originalAmount: { visible: false, editable: false },
      adjustedAmount: { visible: false, editable: false },
      adjustmentReason: { visible: false, editable: false },
      operator: { visible: false, editable: false },
      adjustmentDate: { visible: false, editable: false },
      source: { visible: true, editable: false },
      rawRow: { visible: true, editable: false },
      sourceFile: { visible: true, editable: false },
    },
    actions: ['view', 'report'],
  },
};

export function hasPermission(role: Role, action: string): boolean {
  const config = permissionConfig[role];
  return config?.actions.includes(action) || false;
}

export function canViewField(role: Role, field: string): boolean {
  const config = permissionConfig[role];
  return config?.fields[field]?.visible ?? false;
}

export function canEditField(role: Role, field: string): boolean {
  const config = permissionConfig[role];
  return config?.fields[field]?.editable ?? false;
}

export function filterFieldsByRole<T extends Record<string, any>>(
  role: Role,
  data: T,
  mode: 'view' | 'edit' = 'view'
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(data)) {
    const fieldPerm = permissionConfig[role]?.fields[key];
    if (!fieldPerm) continue;
    
    if (mode === 'view' && fieldPerm.visible) {
      (result as any)[key] = value;
    } else if (mode === 'edit' && fieldPerm.editable) {
      (result as any)[key] = value;
    }
  }
  return result;
}

export function getVisibleFields(role: Role): string[] {
  const config = permissionConfig[role];
  if (!config) return [];
  return Object.entries(config.fields)
    .filter(([, perm]) => perm.visible)
    .map(([key]) => key);
}

export function getEditableFields(role: Role): string[] {
  const config = permissionConfig[role];
  if (!config) return [];
  return Object.entries(config.fields)
    .filter(([, perm]) => perm.editable)
    .map(([key]) => key);
}

export function maskDataByRole<T extends Record<string, any>>(
  role: Role,
  data: T
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (canViewField(role, key)) {
      result[key] = value;
    } else {
      result[key] = '******';
    }
  }
  return result;
}
