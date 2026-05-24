const createTables = `
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  bid_no TEXT,
  operator TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  previous_status TEXT,
  freeze_reason TEXT,
  manual_remark TEXT,
  is_frozen INTEGER DEFAULT 0,
  frozen_at DATETIME,
  frozen_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  attachment_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  file_size INTEGER,
  version INTEGER DEFAULT 1,
  upload_by TEXT NOT NULL,
  page_count INTEGER,
  page_modified TEXT,
  is_valid INTEGER DEFAULT 1,
  validation_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  action TEXT NOT NULL,
  operator TEXT NOT NULL,
  reason TEXT,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS audit_trails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER,
  attachment_id INTEGER,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  operator TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failed_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  record_type TEXT NOT NULL,
  record_content TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  is_resolved INTEGER DEFAULT 0,
  resolved_by TEXT,
  resolved_at DATETIME,
  resolution_remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS report_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  report_date DATE NOT NULL,
  total_count INTEGER DEFAULT 0,
  unhandled_count INTEGER DEFAULT 0,
  corrected_count INTEGER DEFAULT 0,
  need_manual_confirm_count INTEGER DEFAULT 0,
  frozen_before_status TEXT,
  frozen_after_status TEXT,
  manual_remark TEXT,
  export_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_batch_no ON batches(batch_no);
CREATE INDEX IF NOT EXISTS idx_attachments_batch_id ON attachments(batch_id);
CREATE INDEX IF NOT EXISTS idx_status_history_batch_id ON status_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_batch_id ON audit_trails(batch_id);
CREATE INDEX IF NOT EXISTS idx_failed_records_batch_id ON failed_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_failed_records_is_resolved ON failed_records(is_resolved);
`;

const ATTACHMENT_TYPES = {
  QUALIFICATION: 'qualification',
  PRICE_VERSION: 'price_version',
  SEALED_SCAN: 'sealed_scan',
  REFUND_FLOW: 'refund_flow',
  INVENTORY_DIFF: 'inventory_diff'
};

const BATCH_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  REVIEW_PASSED: 'REVIEW_PASSED',
  REVIEW_REJECTED: 'REVIEW_REJECTED',
  FROZEN: 'FROZEN',
  SETTLED: 'SETTLED',
  ARCHIVED: 'ARCHIVED',
  CANCELLED: 'CANCELLED'
};

const ACTIONS = {
  CREATE: 'CREATE',
  SUBMIT: 'SUBMIT',
  UPLOAD_ATTACHMENT: 'UPLOAD_ATTACHMENT',
  REVIEW: 'REVIEW',
  OVERRULE: 'OVERRULE',
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  SETTLE: 'SETTLE',
  ARCHIVE: 'ARCHIVE',
  CANCEL: 'CANCEL'
};

const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATA_INCONSISTENCY: 'DATA_INCONSISTENCY',
  MISSING_ATTACHMENT: 'MISSING_ATTACHMENT',
  FORMAT_ERROR: 'FORMAT_ERROR',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD'
};

module.exports = {
  createTables,
  ATTACHMENT_TYPES,
  BATCH_STATUSES,
  ACTIONS,
  ERROR_TYPES
};
