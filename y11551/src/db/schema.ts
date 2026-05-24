export const schema = `
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  import_time TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  operator TEXT NOT NULL,
  remark TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cabinet_inventory (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  original_line_number INTEGER NOT NULL,
  cabinet_id TEXT NOT NULL,
  cabinet_name TEXT,
  city TEXT,
  slot_id TEXT NOT NULL,
  slot_name TEXT,
  sku_id TEXT NOT NULL,
  sku_name TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER NOT NULL DEFAULT 0,
  is_hot_sku INTEGER NOT NULL DEFAULT 0,
  is_full INTEGER NOT NULL DEFAULT 0,
  record_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_cabinet_inventory_cabinet_id ON cabinet_inventory(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_inventory_status ON cabinet_inventory(status);
CREATE INDEX IF NOT EXISTS idx_cabinet_inventory_record_time ON cabinet_inventory(record_time);

CREATE TABLE IF NOT EXISTS restock_photos (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  original_line_number INTEGER NOT NULL,
  cabinet_id TEXT NOT NULL,
  photo_path TEXT,
  photo_time TEXT NOT NULL,
  restock_quantity INTEGER NOT NULL DEFAULT 0,
  operator TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_restock_photos_cabinet_id ON restock_photos(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_restock_photos_status ON restock_photos(status);

CREATE TABLE IF NOT EXISTS refund_records (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  original_line_number INTEGER NOT NULL,
  order_id TEXT NOT NULL,
  cabinet_id TEXT NOT NULL,
  sku_id TEXT,
  refund_amount REAL NOT NULL DEFAULT 0,
  refund_time TEXT NOT NULL,
  refund_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_refund_records_cabinet_id ON refund_records(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_refund_records_status ON refund_records(status);

CREATE TABLE IF NOT EXISTS exception_photos (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  original_line_number INTEGER NOT NULL,
  cabinet_id TEXT NOT NULL,
  photo_path TEXT,
  exception_type TEXT,
  exception_time TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_exception_photos_cabinet_id ON exception_photos(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_exception_photos_status ON exception_photos(status);

CREATE TABLE IF NOT EXISTS sms_screenshots (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  original_line_number INTEGER NOT NULL,
  cabinet_id TEXT NOT NULL,
  sms_content TEXT,
  send_time TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_sms_screenshots_cabinet_id ON sms_screenshots(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_sms_screenshots_status ON sms_screenshots(status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,
  batch_id TEXT,
  record_id TEXT,
  record_type TEXT,
  operator TEXT NOT NULL,
  operation_time TEXT NOT NULL,
  before_change TEXT,
  after_change TEXT,
  remark TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_time ON audit_logs(operation_time);
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

CREATE TABLE IF NOT EXISTS failure_records (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  original_line_number INTEGER NOT NULL,
  failure_reason TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_failure_records_batch_id ON failure_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_failure_records_source_type ON failure_records(source_type);
`;
