export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS after_sales_order (
  order_no TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  leader_id TEXT NOT NULL,
  leader_name TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_handler TEXT,
  create_time TEXT NOT NULL,
  update_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leader_refund (
  id TEXT PRIMARY KEY,
  order_no TEXT,
  leader_id TEXT,
  leader_name TEXT,
  city TEXT,
  sku_id TEXT,
  sku_name TEXT,
  refund_quantity INTEGER,
  refund_amount REAL,
  reason TEXT,
  submit_time TEXT,
  images TEXT,
  raw_data TEXT
);

CREATE TABLE IF NOT EXISTS warehouse_review (
  id TEXT PRIMARY KEY,
  order_no TEXT,
  reviewer_id TEXT,
  reviewer_name TEXT,
  sku_id TEXT,
  sku_name TEXT,
  actual_quantity INTEGER,
  actual_amount REAL,
  is_damaged INTEGER DEFAULT 0,
  is_missing INTEGER DEFAULT 0,
  review_result TEXT,
  review_remark TEXT,
  review_time TEXT,
  raw_data TEXT
);

CREATE TABLE IF NOT EXISTS user_remark (
  id TEXT PRIMARY KEY,
  order_no TEXT,
  user_id TEXT,
  user_name TEXT,
  content TEXT,
  images TEXT,
  create_time TEXT,
  raw_data TEXT
);

CREATE TABLE IF NOT EXISTS refund_flow (
  id TEXT PRIMARY KEY,
  order_no TEXT,
  flow_no TEXT,
  refund_amount REAL,
  refund_method TEXT,
  refund_status TEXT,
  operator_id TEXT,
  operator_name TEXT,
  operate_time TEXT,
  raw_data TEXT
);

CREATE TABLE IF NOT EXISTS status_log (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  operator_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  operate_time TEXT NOT NULL,
  extra TEXT,
  FOREIGN KEY (order_no) REFERENCES after_sales_order(order_no)
);

CREATE TABLE IF NOT EXISTS dirty_record (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  dirty_type TEXT NOT NULL,
  field_name TEXT,
  expected_value TEXT,
  actual_value TEXT,
  suggestion TEXT NOT NULL,
  raw_data TEXT NOT NULL,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  resolved_by TEXT,
  resolved_time TEXT,
  resolve_remark TEXT,
  create_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reconciliation_result (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  leader_amount REAL NOT NULL,
  warehouse_amount REAL NOT NULL,
  refund_amount REAL NOT NULL,
  difference REAL NOT NULL,
  is_matched INTEGER NOT NULL DEFAULT 0,
  reconciliation_remark TEXT NOT NULL,
  reconciled_by TEXT,
  reconciled_time TEXT,
  create_time TEXT NOT NULL,
  FOREIGN KEY (order_no) REFERENCES after_sales_order(order_no)
);

CREATE INDEX IF NOT EXISTS idx_leader_refund_order_no ON leader_refund(order_no);
CREATE INDEX IF NOT EXISTS idx_warehouse_review_order_no ON warehouse_review(order_no);
CREATE INDEX IF NOT EXISTS idx_user_remark_order_no ON user_remark(order_no);
CREATE INDEX IF NOT EXISTS idx_refund_flow_order_no ON refund_flow(order_no);
CREATE INDEX IF NOT EXISTS idx_status_log_order_no ON status_log(order_no);
CREATE INDEX IF NOT EXISTS idx_dirty_record_order_no ON dirty_record(order_no);
CREATE INDEX IF NOT EXISTS idx_reconciliation_result_order_no ON reconciliation_result(order_no);
CREATE INDEX IF NOT EXISTS idx_after_sales_order_city ON after_sales_order(city);
CREATE INDEX IF NOT EXISTS idx_after_sales_order_status ON after_sales_order(status);
`;
