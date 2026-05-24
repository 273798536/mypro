export enum ExceptionStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FROZEN = 'frozen',
  SETTLED = 'settled',
  ARCHIVED = 'archived',
  CANCELLED = 'cancelled',
}

export enum ExceptionType {
  OVERDUE = 'overdue',
  DAMAGED = 'damaged',
  LOST = 'lost',
  RENEW_OVERLAP = 'renew_overlap',
  OTHER = 'other',
}

export enum RecordType {
  BORROW_APPLICATION = 'borrow_application',
  EXPRESS_ORDER = 'express_order',
  READER_COMPENSATION = 'reader_compensation',
  SUPPLIER_BILL = 'supplier_bill',
  APPROVAL_EMAIL = 'approval_email',
}

export enum ActionType {
  BATCH_CREATE = 'batch_create',
  ATTACHMENT_UPLOAD = 'attachment_upload',
  REVIEW_DECISION = 'review_decision',
  FREEZE_SETTLEMENT = 'freeze_settlement',
  UNFREEZE = 'unfreeze',
  CANCEL_ARCHIVE = 'cancel_archive',
  STATUS_UPDATE = 'status_update',
  MANUAL_EDIT = 'manual_edit',
}

export enum Role {
  ADMIN = 'admin',
  REVIEWER = 'reviewer',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export interface BorrowApplication {
  id: string;
  applicationNo: string;
  readerId: string;
  readerName: string;
  bookId: string;
  bookTitle: string;
  sourceLibrary: string;
  targetLibrary: string;
  applyDate: Date;
  borrowDate?: Date;
  dueDate?: Date;
  returnDate?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpressOrder {
  id: string;
  orderNo: string;
  borrowApplicationId: string;
  courierCompany: string;
  trackingNo: string;
  sender: string;
  receiver: string;
  sendDate?: Date;
  receiveDate?: Date;
  cost: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReaderCompensation {
  id: string;
  recordNo: string;
  borrowApplicationId: string;
  readerId: string;
  readerName: string;
  compensationType: string;
  amount: number;
  reason: string;
  status: string;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierBill {
  id: string;
  billNo: string;
  supplierId: string;
  supplierName: string;
  borrowApplicationIds: string[];
  totalAmount: number;
  billDate: Date;
  dueDate: Date;
  status: string;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExceptionReceipt {
  id: string;
  receiptNo: string;
  batchId: string;
  exceptionType: ExceptionType;
  status: ExceptionStatus;
  borrowApplicationId: string;
  expressOrderId?: string;
  readerCompensationId?: string;
  supplierBillId?: string;
  readerId: string;
  readerName: string;
  bookTitle: string;
  amount: number;
  reason: string;
  manualReason?: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  frozenBy?: string;
  frozenAt?: Date;
  frozenReason?: string;
  previousStatus?: ExceptionStatus;
  statusBeforeFreeze?: ExceptionStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  receiptId?: string;
  batchId?: string;
  actionType: ActionType;
  operatorId: string;
  operatorName: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Batch {
  id: string;
  batchNo: string;
  name: string;
  recordType: RecordType;
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedRecords: FailedRecord[];
  status: 'processing' | 'completed' | 'failed';
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface FailedRecord {
  rowIndex: number;
  recordData: Record<string, unknown>;
  errors: string[];
}

export interface Attachment {
  id: string;
  receiptId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface ApprovalEmail {
  id: string;
  receiptId: string;
  emailSubject: string;
  emailFrom: string;
  emailTo: string[];
  emailCc?: string[];
  emailBody: string;
  sentAt: Date;
  sentBy: string;
  createdAt: Date;
}
