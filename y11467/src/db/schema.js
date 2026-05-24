const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS retry_queue (
  id TEXT PRIMARY KEY,
  hotline_order_id TEXT NOT NULL,
  style_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  priority INTEGER NOT NULL DEFAULT 5,
  assigned_to TEXT,
  error_message TEXT,
  error_type TEXT,
  retry_classification TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_retry_at DATETIME,
  closed_at DATETIME,
  version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT
);

CREATE TABLE IF NOT EXISTS sample_transfer_order (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  style_code TEXT NOT NULL,
  style_name TEXT,
  sample_type TEXT,
  from_dept TEXT,
  to_dept TEXT,
  transfer_date DATE,
  quantity INTEGER,
  receiver TEXT,
  sender TEXT,
  status TEXT,
  remarks TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_latest BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS size_modification_opinion (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  style_code TEXT NOT NULL,
  size TEXT NOT NULL,
  part TEXT,
  before_value TEXT,
  after_value TEXT,
  modifier TEXT,
  modify_date DATE,
  reason TEXT,
  round INTEGER NOT NULL DEFAULT 1,
  status TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_latest BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS fabric_inventory (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  style_code TEXT NOT NULL,
  fabric_code TEXT NOT NULL,
  fabric_name TEXT,
  color TEXT,
  in_out_type TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  operation_date DATE,
  operator TEXT,
  warehouse TEXT,
  batch_no TEXT,
  linked_order_no TEXT,
  remarks TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_latest BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS sms_screenshot (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  style_code TEXT,
  sender TEXT,
  receiver TEXT,
  send_time DATETIME,
  content TEXT,
  image_path TEXT,
  ocr_text TEXT,
  verified BOOLEAN DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS manual_opinion (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  operator TEXT NOT NULL,
  opinion_type TEXT NOT NULL,
  content TEXT NOT NULL,
  target_record_type TEXT,
  target_record_id TEXT,
  operation_type TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS dirty_record (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  original_data TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_fields TEXT,
  error_message TEXT,
  correction_suggestion TEXT,
  corrected_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  handled_by TEXT,
  handled_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS version_history (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data_snapshot TEXT NOT NULL,
  change_reason TEXT,
  changed_by TEXT,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compensation_record (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  compensation_type TEXT NOT NULL,
  amount DECIMAL(12,2),
  quantity DECIMAL(10,2),
  description TEXT,
  accounted BOOLEAN NOT NULL DEFAULT 0,
  accounted_at DATETIME,
  accounted_by TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES retry_queue(id)
);

CREATE TABLE IF NOT EXISTS dead_letter (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  style_code TEXT,
  error_type TEXT,
  error_message TEXT,
  retry_count INTEGER,
  final_status TEXT,
  archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  can_be_recovered BOOLEAN NOT NULL DEFAULT 1,
  recovery_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_style ON retry_queue(style_code);
CREATE INDEX IF NOT EXISTS idx_queue_next_retry ON retry_queue(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_transfer_queue ON sample_transfer_order(queue_id);
CREATE INDEX IF NOT EXISTS idx_size_queue ON size_modification_opinion(queue_id);
CREATE INDEX IF NOT EXISTS idx_fabric_queue ON fabric_inventory(queue_id);
CREATE INDEX IF NOT EXISTS idx_dirty_queue ON dirty_record(queue_id);
CREATE INDEX IF NOT EXISTS idx_version_queue ON version_history(queue_id);
`;

module.exports = SCHEMA_SQL;
