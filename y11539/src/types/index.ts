export enum MaterialType {
  REGISTRATION_FORM = 'registration_form',
  SIGN_QR_CODE = 'sign_qr_code',
  POST_CLASS_ASSIGNMENT = 'post_class_assignment',
  CUSTOMER_SERVICE_NOTE = 'customer_service_note',
  ANOMALY_PHOTO = 'anomaly_photo'
}

export enum BatchStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  SECONDARY_CONFIRMED = 'secondary_confirmed',
  AUDIT_ONLY = 'audit_only'
}

export enum ProcessResult {
  NORMAL = 'normal',
  PENDING_REVIEW = 'pending_review',
  UNPROCESSABLE = 'unprocessable'
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PENDING_RETRY = 'pending_retry',
  PENDING_MANUAL = 'pending_manual',
  PERMANENT_FAILED = 'permanent_failed',
  COMPLETED = 'completed'
}

export enum BatchStrategy {
  IGNORE = 'ignore',
  OVERWRITE = 'overwrite',
  APPEND = 'append'
}

export interface Batch {
  id: string;
  batchNumber: string;
  trainingName: string;
  trainingDate: string;
  status: BatchStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  processResult?: ProcessResult;
  remark?: string;
}

export interface Material {
  id: string;
  batchId: string;
  type: MaterialType;
  fileName: string;
  fileUrl: string;
  fileHash: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  isSensitive: boolean;
  processResult?: ProcessResult;
  processNote?: string;
}

export interface StatusTransition {
  id: string;
  batchId: string;
  fromStatus: BatchStatus;
  toStatus: BatchStatus;
  operatedBy: string;
  operatedAt: string;
  reason: string;
}

export interface ChangeHistory {
  id: string;
  batchId: string;
  materialId?: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  changeReason: string;
}

export interface AsyncTask {
  id: string;
  batchId?: string;
  taskType: string;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  nextRetryAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  payload: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'hrbp' | 'operator' | 'auditor';
  department: string;
}
