CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  import_time TEXT NOT NULL,
  imported_by TEXT NOT NULL DEFAULT 'system',
  total_records INTEGER DEFAULT 0,
  valid_records INTEGER DEFAULT 0,
  remark TEXT,
  status TEXT NOT NULL DEFAULT 'imported'
);

CREATE TABLE IF NOT EXISTS absorption_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  record_no TEXT NOT NULL,
  sample_name TEXT NOT NULL,
  sample_batch TEXT,
  test_date TEXT,
  temperature REAL,
  temperature_unit TEXT DEFAULT 'C',
  pressure REAL,
  absorbent_mass REAL,
  absorbent_mass_unit TEXT DEFAULT 'g',
  absorbent_mass_precision TEXT,
  gas_volume REAL,
  gas_volume_unit TEXT DEFAULT 'L',
  absorption_rate REAL,
  calculated_rate REAL,
  judgment TEXT,
  original_judgment TEXT,
  data_quality TEXT DEFAULT 'normal',
  quality_issues TEXT,
  remark TEXT,
  imported_remark TEXT,
  supplementary_remark TEXT,
  fill_status TEXT DEFAULT 'complete',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  batch_id INTEGER NOT NULL,
  reviewer TEXT NOT NULL,
  review_time TEXT NOT NULL,
  review_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  review_result TEXT NOT NULL,
  FOREIGN KEY (record_id) REFERENCES absorption_records(id),
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE TABLE IF NOT EXISTS status_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  operator TEXT NOT NULL,
  transition_time TEXT NOT NULL,
  comment TEXT,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE TABLE IF NOT EXISTS anomaly_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  batch_id INTEGER NOT NULL,
  anomaly_type TEXT NOT NULL,
  field_name TEXT,
  before_value TEXT,
  after_value TEXT,
  before_judgment TEXT,
  after_judgment TEXT,
  reason TEXT,
  operator TEXT NOT NULL,
  trace_time TEXT NOT NULL,
  is_retest INTEGER DEFAULT 0,
  retest_suggestion TEXT,
  FOREIGN KEY (record_id) REFERENCES absorption_records(id),
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE TABLE IF NOT EXISTS export_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  export_time TEXT NOT NULL,
  exported_by TEXT NOT NULL,
  file_name TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  export_type TEXT DEFAULT 'report',
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_records_batch ON absorption_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_reviews_record ON review_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_record ON anomaly_traces(record_id);
CREATE INDEX IF NOT EXISTS idx_status_batch ON status_transitions(batch_id);
