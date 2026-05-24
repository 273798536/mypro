export enum UserRole {
  DATA_ENTRY = 'data_entry',
  REVIEWER = 'reviewer',
  SUPERVISOR = 'supervisor',
  READ_ONLY = 'read_only'
}

export enum CompensationStatus {
  SUBMITTED = 'submitted',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  RETRYING = 'retrying',
  MANUAL_TAKEOVER = 'manual_takeover',
  COMPENSATED = 'compensated',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  DEAD_LETTER = 'dead_letter'
}

export enum DataSource {
  CHANGE_ORDER = 'change_order',
  AUDIT_OPINION = 'audit_opinion',
  CUSTOMER_QUOTE = 'customer_quote',
  MANUAL_PRICING = 'manual_pricing',
  SHIFT_RECORD = 'shift_record'
}

export enum RetryCategory {
  TEMPORARY_ERROR = 'temporary_error',
  DATA_INCONSISTENCY = 'data_inconsistency',
  EXTERNAL_SERVICE_DOWN = 'external_service_down',
  MISSING_INFORMATION = 'missing_information',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  UNKNOWN = 'unknown'
}

export enum OperationType {
  SUBMIT = 'submit',
  QUEUE = 'queue',
  RETRY = 'retry',
  TAKEOVER = 'takeover',
  COMPENSATE = 'compensate',
  REVIEW = 'review',
  APPROVE = 'approve',
  REJECT = 'reject',
  CLOSE = 'close',
  RECOVER = 'recover',
  UPDATE = 'update'
}
