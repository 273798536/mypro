const QUEUE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  WAITING_RETRY: 'waiting_retry',
  WAITING_MANUAL: 'waiting_manual',
  COMPENSATED: 'compensated',
  PERMANENT_FAILED: 'permanent_failed',
  CLOSED: 'closed',
  SUCCESS: 'success'
};

const ACTION_TYPES = {
  RECEIPT_SUBMIT: 'receipt_submit',
  RETRY: 'retry',
  MANUAL_TAKEOVER: 'manual_takeover',
  COMPENSATION: 'compensation',
  CLOSE: 'close',
  REJUDGE: 'rejudge'
};

const SOURCE_TYPES = {
  SAMPLE_LABEL: 'sample_label',
  TEMPERATURE_RECORD: 'temperature_record',
  STORE_COMPLAINT: 'store_complaint',
  REFUND_RECORD: 'refund_record',
  INVENTORY_DIFFERENCE: 'inventory_difference'
};

const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  STATUS_CHANGE: 'status_change',
  IMPORT: 'import',
  REJUDGE: 'rejudge',
  COMPENSATE: 'compensate'
};

const PRIORITY_LEVELS = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

const IMPORT_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial'
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  EXTERNAL_SYSTEM_ERROR: 'EXTERNAL_SYSTEM_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

module.exports = {
  QUEUE_STATUS,
  ACTION_TYPES,
  SOURCE_TYPES,
  OPERATION_TYPES,
  PRIORITY_LEVELS,
  IMPORT_STATUS,
  ERROR_CODES
};
