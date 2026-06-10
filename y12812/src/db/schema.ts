export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  batch_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'imported',
  remark TEXT
);

CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  barcode TEXT NOT NULL,
  group_name TEXT NOT NULL,
  seed_type TEXT NOT NULL,
  sowing_date TEXT,
  germination_dates TEXT,
  total_seeds INTEGER NOT NULL DEFAULT 0,
  germinated_seeds INTEGER NOT NULL DEFAULT 0,
  germination_rate REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'imported',
  qc_passed INTEGER NOT NULL DEFAULT 0,
  qc_remark TEXT,
  abnormal INTEGER NOT NULL DEFAULT 0,
  abnormal_remark TEXT,
  pathology_remark TEXT,
  handling_opinion TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  UNIQUE(batch_id, barcode)
);

CREATE TABLE IF NOT EXISTS processing_records (
  id TEXT PRIMARY KEY,
  sample_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  operator TEXT NOT NULL,
  operation_time TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  remark TEXT,
  shared INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (sample_id) REFERENCES samples(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  sample_id TEXT,
  batch_id TEXT,
  operation TEXT NOT NULL,
  operator TEXT NOT NULL,
  operate_time TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip TEXT
);

CREATE TABLE IF NOT EXISTS status_transitions (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  sample_id TEXT,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  operator TEXT NOT NULL,
  transition_time TEXT NOT NULL,
  remark TEXT,
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (sample_id) REFERENCES samples(id)
);

CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  export_time TEXT NOT NULL,
  operator TEXT NOT NULL,
  run_number INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX IF NOT EXISTS idx_samples_batch_id ON samples(batch_id);
CREATE INDEX IF NOT EXISTS idx_samples_barcode ON samples(barcode);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_processing_records_sample_id ON processing_records(sample_id);
CREATE INDEX IF NOT EXISTS idx_processing_records_batch_id ON processing_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sample_id ON audit_logs(sample_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_batch_id ON status_transitions(batch_id);
`;
