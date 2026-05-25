export enum UserRole {
  DATA_ENTRY = 'data_entry',
  REVIEWER = 'reviewer',
  SUPERVISOR = 'supervisor',
  READ_ONLY = 'read_only'
}

export enum ReimbursementStatus {
  SUBMITTED = 'submitted',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  PENDING_REVIEW = 'pending_review',
  MANUAL_INTERVENTION = 'manual_intervention',
  COMPENSATED = 'compensated',
  CLOSED = 'closed',
  RETRYING = 'retrying',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter'
}

export enum MaterialSource {
  INVOICE_PDF = 'invoice_pdf',
  TRAVEL_APPLICATION = 'travel_application',
  PAYMENT_RECORD = 'payment_record',
  SUPPLEMENTARY_FORM = 'supplementary_form',
  SHIFT_RECORD = 'shift_record'
}

export enum RetryCategory {
  DUPLICATE_DETECTION = 'duplicate_detection',
  MISMATCH_AMOUNT = 'mismatch_amount',
  MISSING_DOCUMENT = 'missing_document',
  INVALID_DATA = 'invalid_data',
  SYSTEM_ERROR = 'system_error',
  CONFLICT_RESOLUTION = 'conflict_resolution'
}

export enum FailureReason {
  DUPLICATE_ACCOMMODATION = 'duplicate_accommodation',
  DUPLICATE_TRANSPORTATION = 'duplicate_transportation',
  AMOUNT_MISMATCH = 'amount_mismatch',
  INVOICE_INVALID = 'invoice_invalid',
  MISSING_APPROVAL = 'missing_approval',
  TRAVEL_CONFLICT = 'travel_conflict',
  SHIFT_MISMATCH = 'shift_mismatch',
  CURRENCY_ERROR = 'currency_error',
  EXPIRED_INVOICE = 'expired_invoice',
  SYSTEM_ERROR = 'system_error'
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusLog {
  id: string;
  reimbursementId: string;
  fromStatus: ReimbursementStatus | null;
  toStatus: ReimbursementStatus;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  reason: string;
  remarks?: string;
}

export interface Material {
  id: string;
  reimbursementId: string;
  source: MaterialSource;
  sourceId: string;
  fileName?: string;
  fileUrl?: string;
  parsedData: Record<string, any>;
  uploadedBy: string;
  uploadedAt: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface RetryQueueItem {
  id: string;
  reimbursementId: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  lastRetryAt?: string;
  lastError?: string;
  category: RetryCategory;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface DeadLetterItem {
  id: string;
  reimbursementId: string;
  originalStatus: ReimbursementStatus;
  failureReason: FailureReason;
  failureDetails: string;
  retryHistory: RetryQueueItem[];
  reportedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ReimbursementItem {
  id: string;
  type: 'accommodation' | 'transportation' | 'meal' | 'other';
  amount: number;
  currency: string;
  date: string;
  description: string;
  receiptNumber?: string;
  relatedTravelId?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
}

export interface Reimbursement {
  id: string;
  applicationNo: string;
  applicantId: string;
  applicantName: string;
  department: string;
  travelApplicationId?: string;
  totalAmount: number;
  currency: string;
  items: ReimbursementItem[];
  status: ReimbursementStatus;
  materials: Material[];
  statusLogs: StatusLog[];
  currentRetry?: RetryQueueItem;
  failureReason?: FailureReason;
  failureDetails?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  compensatedAt?: string;
  closedAt?: string;
  isInSummary: boolean;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  status?: ReimbursementStatus;
  department?: string;
  retryCategory?: RetryCategory;
  failureReason?: FailureReason;
}

export interface ReportSummary {
  totalCount: number;
  totalAmount: number;
  byStatus: Record<ReimbursementStatus, { count: number; amount: number }>;
  byRetryCategory: Record<RetryCategory, { count: number; amount: number }>;
  byFailureReason: Record<FailureReason, { count: number; amount: number }>;
  deadLetterCount: number;
  retryableCount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
