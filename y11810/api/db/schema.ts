export const schemaSQL = `
CREATE TABLE IF NOT EXISTS channel (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account TEXT NOT NULL UNIQUE,
  rate REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_history (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  old_rate REAL NOT NULL,
  new_rate REAL NOT NULL,
  effective_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  operator TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channel(id)
);

CREATE TABLE IF NOT EXISTS impression_log (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  user_id TEXT,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  impression_time TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channel(id)
);
CREATE INDEX IF NOT EXISTS idx_impression_request ON impression_log(request_id);
CREATE INDEX IF NOT EXISTS idx_impression_time ON impression_log(impression_time);
CREATE INDEX IF NOT EXISTS idx_impression_channel ON impression_log(channel_id);

CREATE TABLE IF NOT EXISTS click_log (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  impression_id TEXT,
  user_id TEXT,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  click_time TEXT NOT NULL,
  is_anomaly INTEGER NOT NULL DEFAULT 0,
  anomaly_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channel(id),
  FOREIGN KEY (impression_id) REFERENCES impression_log(id)
);
CREATE INDEX IF NOT EXISTS idx_click_request ON click_log(request_id);
CREATE INDEX IF NOT EXISTS idx_click_time ON click_log(click_time);
CREATE INDEX IF NOT EXISTS idx_click_channel ON click_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_click_impression ON click_log(impression_id);

CREATE TABLE IF NOT EXISTS conversion_order (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  order_no TEXT NOT NULL UNIQUE,
  click_id TEXT,
  user_id TEXT,
  amount REAL NOT NULL,
  conversion_time TEXT NOT NULL,
  is_duplicate INTEGER NOT NULL DEFAULT 0,
  duplicate_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channel(id),
  FOREIGN KEY (click_id) REFERENCES click_log(id)
);
CREATE INDEX IF NOT EXISTS idx_conversion_time ON conversion_order(conversion_time);
CREATE INDEX IF NOT EXISTS idx_conversion_channel ON conversion_order(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversion_click ON conversion_order(click_id);
CREATE INDEX IF NOT EXISTS idx_conversion_user ON conversion_order(user_id);

CREATE TABLE IF NOT EXISTS deduction_rule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  condition TEXT NOT NULL,
  deduction_rate REAL NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settlement_run (
  id TEXT PRIMARY KEY,
  batch_no TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  deduction_amount REAL NOT NULL DEFAULT 0,
  final_amount REAL NOT NULL DEFAULT 0,
  base_run_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (channel_id) REFERENCES channel(id),
  FOREIGN KEY (base_run_id) REFERENCES settlement_run(id)
);
CREATE INDEX IF NOT EXISTS idx_run_channel ON settlement_run(channel_id);
CREATE INDEX IF NOT EXISTS idx_run_date ON settlement_run(start_date, end_date);

CREATE TABLE IF NOT EXISTS settlement_detail (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  conversion_id TEXT NOT NULL,
  impression_id TEXT,
  click_id TEXT,
  channel_id TEXT NOT NULL,
  amount REAL NOT NULL,
  rate REAL NOT NULL,
  commission REAL NOT NULL,
  final_commission REAL NOT NULL,
  attribution_trace TEXT NOT NULL,
  rate_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES settlement_run(id),
  FOREIGN KEY (conversion_id) REFERENCES conversion_order(id),
  FOREIGN KEY (channel_id) REFERENCES channel(id)
);
CREATE INDEX IF NOT EXISTS idx_detail_run ON settlement_detail(run_id);
CREATE INDEX IF NOT EXISTS idx_detail_conversion ON settlement_detail(conversion_id);

CREATE TABLE IF NOT EXISTS deduction_item (
  id TEXT PRIMARY KEY,
  detail_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_version INTEGER NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (detail_id) REFERENCES settlement_detail(id),
  FOREIGN KEY (rule_id) REFERENCES deduction_rule(id)
);

CREATE TABLE IF NOT EXISTS exception_record (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  suggestion TEXT,
  affected_count INTEGER NOT NULL DEFAULT 0,
  affected_run_ids TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  handled_by TEXT,
  handled_at TEXT,
  handle_note TEXT,
  created_at TEXT NOT NULL,
  trace_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_exception_type ON exception_record(type);
CREATE INDEX IF NOT EXISTS idx_exception_status ON exception_record(status);
CREATE INDEX IF NOT EXISTS idx_exception_level ON exception_record(level);

CREATE TABLE IF NOT EXISTS action_log (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  before_state TEXT,
  after_state TEXT,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_trace ON action_log(trace_id);
CREATE INDEX IF NOT EXISTS idx_log_resource ON action_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_log_time ON action_log(timestamp);
`;
