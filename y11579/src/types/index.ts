export enum LedgerStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
  AUDIT = 'audit'
}

export enum BatchStrategy {
  IGNORE = 'ignore',
  OVERWRITE = 'overwrite',
  APPEND = 'append'
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  WAITING_RETRY = 'waiting_retry',
  WAITING_MANUAL = 'waiting_manual',
  PERMANENT_FAILED = 'permanent_failed',
  COMPLETED = 'completed'
}

export enum Role {
  FACTORY_OWNER = 'factory_owner',
  ACCOUNTANT = 'accountant',
  AUDITOR = 'auditor',
  OPERATOR = 'operator'
}

export enum ProcessResult {
  NORMAL = 'normal',
  PENDING_REVIEW = 'pending_review',
  UNPROCESSABLE = 'unprocessable'
}

export interface DeliveryNote {
  id: string;
  batchNo: string;
  supplierId: string;
  supplierName: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  deliveryDate: string;
  warehouse: string;
  receiver: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReworkRecord {
  id: string;
  batchNo: string;
  deliveryNoteId: string;
  reworkReason: string;
  reworkType: string;
  reworkQuantity: number;
  reworkDate: string;
  responsiblePerson: string;
  completionDate?: string;
  result?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionDetail {
  id: string;
  batchNo: string;
  deliveryNoteId?: string;
  reworkRecordId?: string;
  deductionType: string;
  deductionAmount: number;
  deductionReason: string;
  deductionDate: string;
  operator: string;
  evidenceUrls?: string[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandoverPaper {
  id: string;
  batchNo: string;
  deliveryNoteId: string;
  storeId: string;
  storeName: string;
  handoverDate: string;
  handoverPerson: string;
  receiver: string;
  items: Array<{
    productCode: string;
    productName: string;
    quantity: number;
    unit: string;
  }>;
  remark?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SmsEvidence {
  id: string;
  batchNo: string;
  relatedType: string;
  relatedId: string;
  sender: string;
  receiver: string;
  content: string;
  sendTime: string;
  screenshotUrl: string;
  createdAt: string;
}

export interface ChangeHistory {
  id: string;
  ledgerId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedByRole: Role;
  changeReason: string;
  changedAt: string;
  diffSummary?: string;
}

export interface Ledger {
  id: string;
  batchNo: string;
  status: LedgerStatus;
  createdBy: string;
  createdByRole: Role;
  currentHandler?: string;
  rejectReason?: string;
  deliveryNotes: DeliveryNote[];
  reworkRecords: ReworkRecord[];
  deductionDetails: DeductionDetail[];
  handoverPapers: HandoverPaper[];
  smsEvidences: SmsEvidence[];
  processResult?: ProcessResult;
  processMessage?: string;
  sensitiveFieldsMasked: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  confirmedAt?: string;
}

export interface AsyncTask {
  id: string;
  taskType: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  errorStack?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  name: string;
  department: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerSnapshot {
  id: string;
  ledgerId: string;
  ledgerData: string;
  status: LedgerStatus;
  snapshotType: 'before' | 'after';
  action: string;
  createdBy: string;
  createdAt: string;
}
