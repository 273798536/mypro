import { UserRole, FieldPermission, RolePermissions } from '../types';

const baseFields = [
  'id', 'createdAt', 'updatedAt', 'status',
  'originalRowNumber', 'originalRowData',
  'importBatchId', 'createdBy'
];

const repairOrderFields = [
  'orderNo', 'engineerName', 'engineerId', 'orderDate',
  'customerName', 'customerPhone', 'faultDescription', 'totalAmount'
];

const sparePartScanFields = [
  'scanNo', 'repairOrderNo', 'partCode', 'partName',
  'quantity', 'actionType', 'engineerName', 'scanTime', 'unitPrice'
];

const customerReceiptFields = [
  'receiptNo', 'repairOrderNo', 'customerName',
  'receiptTime', 'photoUrl', 'photoHash', 'remark'
];

const manualPriceAdjustFields = [
  'adjustNo', 'repairOrderNo', 'partCode',
  'originalPrice', 'adjustedPrice', 'adjustReason',
  'approvedBy', 'adjustDate'
];

const shiftRecordFields = [
  'shiftNo', 'engineerName', 'shiftType', 'shiftDate',
  'checkInTime', 'checkOutTime', 'remark'
];

const dirtyRecordFields = [
  'id', 'sourceType', 'sourceRecordId', 'dirtyType',
  'fieldName', 'description', 'originalValue', 'expectedValue',
  'suggestedFix', 'status', 'fixedValue', 'fixedBy', 'fixedAt',
  'originalRowNumber', 'originalRowData', 'reviewRemark',
  'reviewedBy', 'reviewedAt', 'createdAt'
];

export const ALLOWED_ACTIONS: Record<UserRole, string[]> = {
  [UserRole.ENTRY]: ['import', 'check', 'fix', 'export', 'history'],
  [UserRole.REVIEW]: ['import', 'check', 'fix', 'report', 'export', 'history', 'review'],
  [UserRole.SUPERVISOR]: ['init', 'import', 'check', 'fix', 'report', 'export', 'history', 'review', 'approve', 'create_user'],
  [UserRole.READONLY]: ['report', 'export', 'history']
};

export function canPerformAction(role: UserRole, action: string): boolean {
  return ALLOWED_ACTIONS[role]?.includes(action) ?? false;
}

export function getRepairOrderPermissions(role: UserRole): FieldPermission {
  const allFields = [...baseFields, ...repairOrderFields, 'reviewedBy', 'reviewedAt'];
  
  switch (role) {
    case UserRole.ENTRY:
      return {
        visible: allFields,
        editable: repairOrderFields.filter(f => !['totalAmount'].includes(f))
      };
    case UserRole.REVIEW:
      return {
        visible: allFields,
        editable: ['status', 'reviewRemark']
      };
    case UserRole.SUPERVISOR:
      return {
        visible: allFields,
        editable: allFields
      };
    case UserRole.READONLY:
      return {
        visible: allFields.filter(f => !['customerPhone'].includes(f)),
        editable: []
      };
  }
}

export function getSparePartScanPermissions(role: UserRole): FieldPermission {
  const allFields = [...baseFields, ...sparePartScanFields];
  
  switch (role) {
    case UserRole.ENTRY:
      return {
        visible: allFields,
        editable: sparePartScanFields.filter(f => !['unitPrice'].includes(f))
      };
    case UserRole.REVIEW:
      return {
        visible: allFields,
        editable: ['status']
      };
    case UserRole.SUPERVISOR:
      return {
        visible: allFields,
        editable: allFields
      };
    case UserRole.READONLY:
      return {
        visible: allFields,
        editable: []
      };
  }
}

export function getCustomerReceiptPermissions(role: UserRole): FieldPermission {
  const allFields = [...baseFields, ...customerReceiptFields];
  
  switch (role) {
    case UserRole.ENTRY:
      return {
        visible: allFields,
        editable: customerReceiptFields
      };
    case UserRole.REVIEW:
      return {
        visible: allFields,
        editable: ['status', 'remark']
      };
    case UserRole.SUPERVISOR:
      return {
        visible: allFields,
        editable: allFields
      };
    case UserRole.READONLY:
      return {
        visible: allFields,
        editable: []
      };
  }
}

export function getManualPriceAdjustPermissions(role: UserRole): FieldPermission {
  const allFields = [...baseFields, ...manualPriceAdjustFields];
  
  switch (role) {
    case UserRole.ENTRY:
      return {
        visible: allFields.filter(f => !['adjustedPrice', 'approvedBy'].includes(f)),
        editable: []
      };
    case UserRole.REVIEW:
      return {
        visible: allFields,
        editable: ['adjustedPrice', 'adjustReason']
      };
    case UserRole.SUPERVISOR:
      return {
        visible: allFields,
        editable: allFields
      };
    case UserRole.READONLY:
      return {
        visible: allFields.filter(f => !['adjustedPrice'].includes(f)),
        editable: []
      };
  }
}

export function getShiftRecordPermissions(role: UserRole): FieldPermission {
  const allFields = [...baseFields, ...shiftRecordFields];
  
  switch (role) {
    case UserRole.ENTRY:
      return {
        visible: allFields,
        editable: shiftRecordFields
      };
    case UserRole.REVIEW:
      return {
        visible: allFields,
        editable: ['status', 'remark']
      };
    case UserRole.SUPERVISOR:
      return {
        visible: allFields,
        editable: allFields
      };
    case UserRole.READONLY:
      return {
        visible: allFields,
        editable: []
      };
  }
}

export function getDirtyRecordPermissions(role: UserRole): FieldPermission {
  switch (role) {
    case UserRole.ENTRY:
      return {
        visible: dirtyRecordFields,
        editable: ['fixedValue']
      };
    case UserRole.REVIEW:
      return {
        visible: dirtyRecordFields,
        editable: ['reviewRemark', 'status']
      };
    case UserRole.SUPERVISOR:
      return {
        visible: dirtyRecordFields,
        editable: dirtyRecordFields
      };
    case UserRole.READONLY:
      return {
        visible: dirtyRecordFields,
        editable: []
      };
  }
}

export function filterFieldsByPermission<T extends Record<string, any>>(
  data: T,
  permission: FieldPermission,
  isEdit: boolean = false
): Partial<T> {
  const fields = isEdit ? permission.editable : permission.visible;
  const result: Partial<T> = {};
  
  for (const field of fields) {
    if (field in data) {
      result[field as keyof T] = data[field as keyof T];
    }
  }
  
  return result;
}
