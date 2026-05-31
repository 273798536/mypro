const TABLES = {
  BOOTH_CONTRACTS: 'booth_contracts',
  DEPOSIT_TRANSACTIONS: 'deposit_transactions',
  POWER_REQUESTS: 'power_requests',
  REFUND_RECORDS: 'refund_records',
  CONFLICT_LOGS: 'conflict_logs',
  DEDUCTION_TRIALS: 'deduction_trials',
  EVIDENCE_LINKS: 'evidence_links',
  HISTORY_RECORDS: 'history_records',
  MANUAL_CORRECTIONS: 'manual_corrections'
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLES.BOOTH_CONTRACTS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_no TEXT UNIQUE NOT NULL,
  booth_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  power_included_kw DECIMAL(5,2) DEFAULT 0,
  contract_date DATE NOT NULL,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ${TABLES.DEPOSIT_TRANSACTIONS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_no TEXT UNIQUE NOT NULL,
  contract_no TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  payment_method TEXT,
  operator TEXT,
  photo_url TEXT,
  photo_upload_time TIMESTAMP,
  remarks TEXT,
  is_reconciled BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_no) REFERENCES ${TABLES.BOOTH_CONTRACTS}(contract_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.POWER_REQUESTS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_no TEXT UNIQUE NOT NULL,
  contract_no TEXT NOT NULL,
  request_kw DECIMAL(5,2) NOT NULL,
  request_date DATE NOT NULL,
  usage_days INTEGER NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  is_paid_from_deposit BOOLEAN DEFAULT 1,
  operator TEXT,
  on_site_photo_url TEXT,
  on_site_photo_time TIMESTAMP,
  remarks TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_no) REFERENCES ${TABLES.BOOTH_CONTRACTS}(contract_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.REFUND_RECORDS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  refund_no TEXT UNIQUE NOT NULL,
  contract_no TEXT NOT NULL,
  total_deposit_received DECIMAL(10,2) NOT NULL,
  total_power_charge DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) DEFAULT 0,
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_status TEXT DEFAULT 'pending',
  refund_date DATE,
  operator TEXT,
  has_conflicts BOOLEAN DEFAULT 0,
  evidence_summary TEXT,
  final_decision TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_no) REFERENCES ${TABLES.BOOTH_CONTRACTS}(contract_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.CONFLICT_LOGS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conflict_no TEXT UNIQUE NOT NULL,
  contract_no TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  source_data TEXT NOT NULL,
  contract_value TEXT,
  transaction_value TEXT,
  power_value TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution TEXT,
  resolved_by TEXT,
  status TEXT DEFAULT 'pending',
  evidence_ref TEXT,
  FOREIGN KEY (contract_no) REFERENCES ${TABLES.BOOTH_CONTRACTS}(contract_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.DEDUCTION_TRIALS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_no TEXT UNIQUE NOT NULL,
  refund_no TEXT NOT NULL,
  deduction_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  evidence_source TEXT,
  is_contested BOOLEAN DEFAULT 0,
  contest_remark TEXT,
  trial_status TEXT DEFAULT 'proposed',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (refund_no) REFERENCES ${TABLES.REFUND_RECORDS}(refund_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.EVIDENCE_LINKS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_no TEXT UNIQUE NOT NULL,
  refund_no TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  source_field TEXT,
  evidence_value TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (refund_no) REFERENCES ${TABLES.REFUND_RECORDS}(refund_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.HISTORY_RECORDS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  history_no TEXT UNIQUE NOT NULL,
  contract_no TEXT NOT NULL,
  record_type TEXT NOT NULL,
  original_data TEXT NOT NULL,
  processed_result TEXT,
  operator TEXT,
  operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT,
  FOREIGN KEY (contract_no) REFERENCES ${TABLES.BOOTH_CONTRACTS}(contract_no)
);

CREATE TABLE IF NOT EXISTS ${TABLES.MANUAL_CORRECTIONS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correction_no TEXT UNIQUE NOT NULL,
  refund_no TEXT NOT NULL,
  correction_type TEXT NOT NULL,
  original_value DECIMAL(10,2),
  corrected_value DECIMAL(10,2),
  reason TEXT NOT NULL,
  operator TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (refund_no) REFERENCES ${TABLES.REFUND_RECORDS}(refund_no)
);

CREATE INDEX IF NOT EXISTS idx_contract_no_all ON ${TABLES.DEPOSIT_TRANSACTIONS}(contract_no);
CREATE INDEX IF NOT EXISTS idx_contract_no_power ON ${TABLES.POWER_REQUESTS}(contract_no);
CREATE INDEX IF NOT EXISTS idx_contract_no_refund ON ${TABLES.REFUND_RECORDS}(contract_no);
CREATE INDEX IF NOT EXISTS idx_refund_no_evidence ON ${TABLES.EVIDENCE_LINKS}(refund_no);
`;

module.exports = { TABLES, SCHEMA_SQL };
