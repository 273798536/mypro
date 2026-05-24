export enum ReceiptStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
  FROZEN = 'frozen',
  ARCHIVED = 'archived',
  WITHDRAWN = 'withdrawn'
}

export enum DataSourceType {
  DELIVERY_NOTE = 'delivery_note',
  REPAIR_RECORD = 'repair_record',
  DEDUCTION_DETAIL = 'deduction_detail',
  STORE_HANDOVER = 'store_handover',
  CUSTOMER_SERVICE_NOTE = 'customer_service_note'
}

export interface Operator {
  id: string;
  name: string;
  role: string;
}

export interface StatusTransition {
  id: string;
  receiptId: string;
  fromStatus: ReceiptStatus;
  toStatus: ReceiptStatus;
  operator: Operator;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface OriginalEvidence {
  id: string;
  receiptId: string;
  sourceType: DataSourceType;
  sourceFile: string;
  originalLineNumber: number;
  originalValue: string;
  parsedValue: string;
  fieldName: string;
  importedAt: Date;
  importBatchId: string;
}

export interface Attachment {
  id: string;
  receiptId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  uploadedBy: Operator;
  uploadedAt: Date;
  description?: string;
}

export interface ReconciliationReceipt {
  id: string;
  batchNo: string;
  semiProductCode: string;
  semiProductName: string;
  supplierId: string;
  supplierName: string;
  status: ReceiptStatus;
  currentStatus: ReceiptStatus;
  statusBeforeFrozen?: ReceiptStatus;
  quantity: number;
  abnormalAmount: number;
  deductionAmount: number;
  confirmedAmount: number;
  customerServiceNotes?: string;
  manualReason?: string;
  isManualModified: boolean;
  frozenBy?: Operator;
  frozenAt?: Date;
  frozenReason?: string;
  createdBy: Operator;
  createdAt: Date;
  updatedBy?: Operator;
  updatedAt?: Date;
  archivedBy?: Operator;
  archivedAt?: Date;
  version: number;
}

export interface ImportResult {
  success: boolean;
  batchId: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  errors: ImportError[];
  createdReceiptIds: string[];
}

export interface ImportError {
  sourceFile: string;
  lineNumber: number;
  fieldName: string;
  originalValue: string;
  errorMessage: string;
  errorCode: string;
}

export interface ExportOptions {
  format: 'excel' | 'csv';
  includeOriginalEvidence: boolean;
  includeStatusHistory: boolean;
  statusFilter?: ReceiptStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportSummary {
  totalReceipts: number;
  byStatus: Record<ReceiptStatus, number>;
  totalAbnormalAmount: number;
  totalDeductionAmount: number;
  totalConfirmedAmount: number;
  frozenCount: number;
  manualModifiedCount: number;
  generatedAt: Date;
  generatedBy: Operator;
}
