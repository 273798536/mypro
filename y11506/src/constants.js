const SOURCE_TYPES = {
  INSPECTION: 'inspection',
  CALIBRATION: 'calibration',
  REPAIR: 'repair',
  INVENTORY: 'inventory',
  REFUND: 'refund'
};

const IMPORT_MODES = {
  APPEND: 'append',
  OVERWRITE: 'overwrite',
  IGNORE: 'ignore'
};

const ERROR_CODES = {
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  CERTIFICATE_EXPIRED: 'CERTIFICATE_EXPIRED',
  CERTIFICATE_EXPIRING_SOON: 'CERTIFICATE_EXPIRING_SOON',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  STATUS_LINKAGE_ISSUE: 'STATUS_LINKAGE_ISSUE',
  IMPORT_ERROR: 'IMPORT_ERROR'
};

const TASK_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RETRY: 'retry',
  MANUAL: 'manual',
  FAILED: 'failed',
  COMPLETED: 'completed'
};

const TASK_TYPES = {
  IMPORT_ASYNC: 'import_async',
  IMPORT_VALIDATION: 'import_validation',
  DATA_CLEANUP: 'data_cleanup',
  EXPORT: 'export',
  REPORT_GENERATION: 'report_generation',
  CERTIFICATE_CHECK: 'certificate_check',
  BATCH_PROCESS: 'batch_process',
  DIFF_ANALYSIS: 'diff_analysis'
};

const RECORD_TYPES = {
  INSPECTION: 'inspection',
  CALIBRATION: 'calibration',
  REPAIR: 'repair',
  INVENTORY: 'inventory',
  REFUND: 'refund',
  BATCH: 'batch'
};

const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  VALIDATION_ERRORS: 2,
  NOT_FOUND: 3,
  INVALID_INPUT: 4
};

module.exports = {
  SOURCE_TYPES,
  IMPORT_MODES,
  ERROR_CODES,
  TASK_STATUSES,
  TASK_TYPES,
  RECORD_TYPES,
  EXIT_CODES
};
