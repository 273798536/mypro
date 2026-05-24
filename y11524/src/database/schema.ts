export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS ledgers (
  id TEXT PRIMARY KEY,
  appointment_no TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  area TEXT NOT NULL,
  appliance_type TEXT NOT NULL,
  current_handler TEXT,
  reject_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(appointment_no, batch_no)
);

CREATE TABLE IF NOT EXISTS appointment_orders (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL,
  appointment_no TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  area TEXT NOT NULL,
  appliance_type TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  status TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  UNIQUE(appointment_no, batch_no)
);

CREATE TABLE IF NOT EXISTS technician_locations (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL,
  appointment_no TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  check_out_time TEXT,
  location_address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  distance_to_customer REAL NOT NULL,
  raw_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  UNIQUE(appointment_no, batch_no)
);

CREATE TABLE IF NOT EXISTS user_reviews (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL,
  appointment_no TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  rating INTEGER NOT NULL,
  review_content TEXT NOT NULL,
  negative_reason TEXT,
  review_time TEXT NOT NULL,
  reviewer_phone TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  UNIQUE(appointment_no, batch_no)
);

CREATE TABLE IF NOT EXISTS second_confirmations (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL,
  appointment_no TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  confirm_type TEXT NOT NULL,
  confirm_result TEXT NOT NULL,
  confirm_time TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  remark TEXT,
  raw_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  UNIQUE(appointment_no, batch_no)
);

CREATE TABLE IF NOT EXISTS status_change_logs (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  sensitive_fields TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
);

CREATE TABLE IF NOT EXISTS failed_records (
  id TEXT PRIMARY KEY,
  data_source TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  error_message TEXT NOT NULL,
  appointment_no TEXT,
  batch_no TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledgers_status ON ledgers(status);
CREATE INDEX IF NOT EXISTS idx_ledgers_area ON ledgers(area);
CREATE INDEX IF NOT EXISTS idx_status_logs_ledger ON status_change_logs(ledger_id);
CREATE INDEX IF NOT EXISTS idx_failed_records_source ON failed_records(data_source);
`;
