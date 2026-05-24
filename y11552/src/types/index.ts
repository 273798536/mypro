export enum FactStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  VERIFIED = 'verified',
  RETRYING = 'retrying',
  MANUAL_REVIEW = 'manual_review',
  COMPENSATED = 'compensated',
  DEAD_LETTER = 'dead_letter',
  CLOSED = 'closed',
  FROZEN = 'frozen',
  WITHDRAWN = 'withdrawn'
}

export enum RetryCategory {
  NETWORK_ISSUE = 'network_issue',
  INVALID_DATA = 'invalid_data',
  MISSING_ATTACHMENT = 'missing_attachment',
  EXTERNAL_API_DOWN = 'external_api_down',
  DATA_CONFLICT = 'data_conflict',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum OperationType {
  SUBMIT = 'submit',
  UPDATE = 'update',
  RETRY = 'retry',
  MANUAL_DECISION = 'manual_decision',
  COMPENSATE = 'compensate',
  CLOSE = 'close',
  WITHDRAW = 'withdraw',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze'
}

export interface CabinetInventory {
  cabinetId: string;
  slotId: string;
  productId: string;
  expectedQuantity: number;
  actualQuantity: number;
  lastRestockTime?: string;
}

export interface ReplenishPhoto {
  photoId: string;
  url: string;
  uploadTime: string;
  uploader: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface RefundRecord {
  refundId: string;
  orderId: string;
  userId: string;
  amount: number;
  refundTime: string;
  reason: string;
}

export interface ExternalReceipt {
  receiptId: string;
  externalSystem: string;
  transactionId: string;
  status: 'pending' | 'success' | 'failed';
  submittedAt: string;
  confirmedAt?: string;
}

export interface CompensationFact {
  factId: string;
  idempotencyKey: string;
  batchId: string;
  city: string;
  cabinetInventory: CabinetInventory;
  replenishPhotos: ReplenishPhoto[];
  refundRecords: RefundRecord[];
  externalReceipts: ExternalReceipt[];
  status: FactStatus;
  retryCount: number;
  retryCategory?: RetryCategory;
  lastRetryAt?: string;
  nextRetryAt?: string;
  assignedTo?: string;
  frozen: boolean;
  frozenAt?: string;
  frozenBy?: string;
  frozenUntil?: string;
  compensatedAt?: string;
  compensatedBy?: string;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  remarks?: string;
}

export interface CompensationQueueItem {
  queueId: string;
  factId: string;
  status: FactStatus;
  retryCategory: RetryCategory;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  lastError?: string;
  nextAttemptAt: string;
  createdAt: string;
}

export interface AuditLog {
  logId: string;
  factId: string;
  operationType: OperationType;
  operatorId: string;
  operatorName: string;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  changeSummary: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface SubmitFactRequest {
  idempotencyKey: string;
  batchId: string;
  city: string;
  cabinetInventory: CabinetInventory;
  replenishPhotos: ReplenishPhoto[];
  refundRecords: RefundRecord[];
  externalReceipts?: ExternalReceipt[];
  createdBy: string;
  remarks?: string;
}

export interface ManualDecisionRequest {
  factId: string;
  decision: 'approve' | 'reject' | 'retry' | 'compensate';
  operatorId: string;
  operatorName: string;
  reason: string;
  newCategory?: RetryCategory;
}

export interface ExportRequest {
  city?: string;
  startDate?: string;
  endDate?: string;
  status?: FactStatus[];
  batchId?: string;
  operatorId: string;
  operatorName: string;
}
