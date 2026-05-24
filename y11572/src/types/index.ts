export enum TicketStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  RETRYING = 'retrying',
  MANUAL_REVIEW = 'manual_review',
  PARTIAL_SUCCESS = 'partial_success',
  COMPENSATED = 'compensated',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  FROZEN = 'frozen',
  DEAD_LETTER = 'dead_letter',
  CLOSED = 'closed',
}

export enum IdempotencyMode {
  IGNORE = 'ignore',
  OVERWRITE = 'overwrite',
  APPEND = 'append',
}

export enum RetryCategory {
  SYSTEM_ERROR = 'system_error',
  NETWORK_ERROR = 'network_error',
  DATA_ERROR = 'data_error',
  BUSINESS_ERROR = 'business_error',
  MANUAL_RETRY = 'manual_retry',
}

export enum CompensateType {
  REFUND = 'refund',
  COUPON = 'coupon',
  POINTS = 'points',
  OTHER = 'other',
}

export enum TransferResponsibility {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  QUALITY = 'quality',
  OTHER = 'other',
}

export interface Operator {
  id: string;
  name: string;
  role: string;
}

export interface StatusChange {
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  changedAt: Date;
  operator: Operator;
  reason: string;
}

export interface SessionSummary {
  sessionId: string;
  customerId: string;
  customerName: string;
  issueType: string;
  summary: string;
  transferCount: number;
  agentNotes: string;
  createdAt: Date;
}

export interface SLARule {
  ruleId: string;
  ruleName: string;
  priority: number;
  responseHours: number;
  resolutionHours: number;
  escalateAfterHours: number;
  conditions: Record<string, unknown>;
}

export interface CompensationApproval {
  approvalId: string;
  approverId: string;
  approverName: string;
  approvedAt: Date;
  approvedAmount: number;
  approvalNotes: string;
}

export interface SecondaryConfirmation {
  confirmationId: string;
  confirmerId: string;
  confirmerName: string;
  confirmedAt: Date;
  confirmationType: string;
  confirmationNotes: string;
  customerAcknowledged: boolean;
}

export interface CompensationAmount {
  type: CompensateType;
  amount: number;
  currency?: string;
  description: string;
}

export interface RetryRecord {
  attempt: number;
  attemptedAt: Date;
  category: RetryCategory;
  errorMessage: string;
  nextRetryAt?: Date;
  executedBy: string;
}

export interface AuditRecord {
  id: string;
  ticketId: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  operator: Operator;
  timestamp: Date;
  ipAddress?: string;
}

export interface TicketData {
  sourceType: string;
  sourceId: string;
  sessionSummary: SessionSummary;
  slaRule: SLARule;
  compensationApproval: CompensationApproval;
  secondaryConfirmation?: SecondaryConfirmation;
  compensationAmounts: CompensationAmount[];
  transferResponsibility?: TransferResponsibility;
  externalReference?: string;
  metadata?: Record<string, unknown>;
}

export interface CompensationTicket {
  id: string;
  batchId: string;
  ticketNo: string;
  status: TicketStatus;
  data: TicketData;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
  retryCategory?: RetryCategory;
  isFrozen: boolean;
  frozenAt?: Date;
  frozenBy?: Operator;
  frozenReason?: string;
  manualOverride?: boolean;
  overrideBy?: Operator;
  overrideReason?: string;
  compensatedAt?: Date;
  closedAt?: Date;
  idempotencyKey: string;
  idempotencyMode: IdempotencyMode;
  createdAt: Date;
  updatedAt: Date;
  submittedBy: Operator;
}

export interface QueueMessage {
  ticketId: string;
  batchId: string;
  retryCount: number;
  category: RetryCategory;
  scheduledAt: Date;
  priority: number;
}

export interface DeadLetterMessage {
  ticketId: string;
  batchId: string;
  failedAt: Date;
  lastError: string;
  retryCount: number;
  canBeRecovered: boolean;
  recoverySuggestion?: string;
}

export interface ExportRecord {
  id: string;
  batchId?: string;
  exportType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, unknown>;
  fileName: string;
  filePath: string;
  recordCount: number;
  frozenUntil: Date;
  exportedBy: Operator;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketFilter {
  status?: TicketStatus[];
  batchId?: string;
  sourceType?: string;
  retryCategory?: RetryCategory;
  isFrozen?: boolean;
  submittedById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
