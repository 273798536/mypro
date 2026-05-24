export enum ReceiptStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  REVIEWING = 'reviewing',
  FROZEN = 'frozen',
  SETTLED = 'settled',
  ARCHIVED = 'archived',
  REJECTED = 'rejected'
}

export enum DataSource {
  CABINET_INVENTORY = 'cabinet_inventory',
  RESTOCK_PHOTO = 'restock_photo',
  REFUND_RECORD = 'refund_record',
  SUPPLIER_BILL = 'supplier_bill',
  APPROVAL_EMAIL = 'approval_email'
}

export enum ExceptionType {
  STOCK_MISMATCH = 'stock_mismatch',
  PHOTO_MISSING = 'photo_missing',
  REFUND_ABNORMAL = 'refund_abnormal',
  BILL_DISCREPANCY = 'bill_discrepancy',
  NETWORK_ERROR = 'network_error',
  DUPLICATE_IMPORT = 'duplicate_import'
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  STATUS_CHANGE = 'status_change',
  ATTACHMENT_ADD = 'attachment_add',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  SETTLE = 'settle',
  ARCHIVE = 'archive',
  REVERT = 'revert'
}

export interface StatusTransition {
  from: ReceiptStatus;
  to: ReceiptStatus;
  allowedRoles: string[];
  requireReason: boolean;
}

export interface AuditLogEntry {
  id: string;
  receiptId: string;
  action: AuditAction;
  oldStatus?: ReceiptStatus;
  newStatus?: ReceiptStatus;
  operatorId: string;
  operatorName: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ExceptionRecord {
  id: string;
  receiptId: string;
  source: DataSource;
  type: ExceptionType;
  description: string;
  rawData: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export interface StockSnapshot {
  id: string;
  receiptId: string;
  cabinetId: string;
  slotId: string;
  beforeStock: number;
  restockAmount: number;
  afterStock: number;
  actualStock?: number;
  isException: boolean;
  snapshotTime: Date;
}
