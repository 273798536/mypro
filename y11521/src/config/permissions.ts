import { PermissionConfig, Role } from '../types';

export const permissionConfig: PermissionConfig = {
  entry: {
    fields: {
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
      rating: { visible: true, editable: false },
      reviewContent: { visible: true, editable: false },
      badReason: { visible: true, editable: false },
      originalAmount: { visible: false, editable: false },
      adjustedAmount: { visible: false, editable: false },
      adjustmentReason: { visible: false, editable: false },
      rawRow: { visible: true, editable: false },
      sourceFile: { visible: true, editable: false },
    },
    actions: ['import', 'view', 'fix_dirty'],
  },
  review: {
    fields: {
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
      rating: { visible: true, editable: false },
      reviewContent: { visible: true, editable: false },
      badReason: { visible: true, editable: true },
      originalAmount: { visible: true, editable: false },
      adjustedAmount: { visible: true, editable: false },
      adjustmentReason: { visible: true, editable: false },
      rawRow: { visible: true, editable: false },
      sourceFile: { visible: true, editable: false },
    },
    actions: ['view', 'approve', 'reject', 'report'],
  },
  supervisor: {
    fields: {
      orderNo: { visible: true, editable: true },
      customerName: { visible: true, editable: true },
      phone: { visible: true, editable: true },
      address: { visible: true, editable: true },
      applianceType: { visible: true, editable: true },
      appointmentDate: { visible: true, editable: true },
      appointmentTime: { visible: true, editable: true },
      technicianId: { visible: true, editable: true },
      technicianName: { visible: true, editable: true },
      status: { visible: true, editable: true },
      rating: { visible: true, editable: true },
      reviewContent: { visible: true, editable: true },
      badReason: { visible: true, editable: true },
      originalAmount: { visible: true, editable: true },
      adjustedAmount: { visible: true, editable: true },
      adjustmentReason: { visible: true, editable: true },
      rawRow: { visible: true, editable: false },
      sourceFile: { visible: true, editable: false },
    },
    actions: ['import', 'view', 'fix_dirty', 'approve', 'reject', 'report', 'export', 'history', 'manage_users'],
  },
  readonly: {
    fields: {
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
      rating: { visible: true, editable: false },
      reviewContent: { visible: true, editable: false },
      badReason: { visible: true, editable: false },
      originalAmount: { visible: false, editable: false },
      adjustedAmount: { visible: false, editable: false },
      adjustmentReason: { visible: false, editable: false },
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
