const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RETRYING: 'retrying',
  WAITING_MANUAL: 'waiting_manual',
  MANUAL_TAKEOVER: 'manual_takeover',
  COMPENSATED: 'compensated',
  CLOSED: 'closed',
  PERMANENT_FAILED: 'permanent_failed'
};

const FAILURE_TYPE = {
  RETRYABLE: 'retryable',
  NEEDS_MANUAL: 'needs_manual',
  PERMANENT: 'permanent'
};

const AUDIT_RESULT = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING: 'pending'
};

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MINUTES = 5;

module.exports = {
  TASK_STATUS,
  FAILURE_TYPE,
  AUDIT_RESULT,
  MAX_RETRY_COUNT,
  RETRY_DELAY_MINUTES
};