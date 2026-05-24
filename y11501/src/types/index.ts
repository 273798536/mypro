export enum UserRole {
  ENTRY = 'entry',
  REVIEW = 'review',
  SUPERVISOR = 'supervisor',
  READONLY = 'readonly'
}

export enum DataSourceType {
  REPAIR_ORDER = 'repair_order',
  SPARE_PART_SCAN = 'spare_part_scan',
  CUSTOMER_RECEIPT = 'customer_receipt',
  MANUAL_PRICE_ADJUST = 'manual_price_adjust',
  SHIFT_RECORD = 'shift_record'
}

export enum DirtyRecordType {
  MISSING_FIELD = 'missing_field',
  CROSS_DATE = 'cross_date',
  NAME_CHANGE = 'name_change',
  AMOUNT_CONFLICT = 'amount_conflict',
  QUANTITY_CONFLICT = 'quantity_conflict'
}

export enum RecordStatus {
  PENDING = 'pending',
  DIRTY = 'dirty',
  FIXED = 'fixed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MERGED = 'merged'
}

export enum BusinessIssueType {
  LATE_ORDER_AFTER_PICKUP = 'late_order_after_pickup',
  RETURN_SCRAP_CONFUSION = 'return_scrap_confusion'
}

export interface ImportRecord {
  sourceType: DataSourceType;
  sourceFile: string;
  rowNumber: number;
  rawData: Record<string, any>;
  importedBy: string;
  importBatchId: string;
}

export interface DirtyRecordDetail {
  type: DirtyRecordType;
  field?: string;
  expected?: string;
  actual?: string;
  suggestion?: string;
  description: string;
}

export interface FieldPermission {
  visible: string[];
  editable: string[];
}

export interface RolePermissions {
  [UserRole.ENTRY]: FieldPermission;
  [UserRole.REVIEW]: FieldPermission;
  [UserRole.SUPERVISOR]: FieldPermission;
  [UserRole.READONLY]: FieldPermission;
}
