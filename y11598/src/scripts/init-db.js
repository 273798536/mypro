const Database = require('better-sqlite3');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const dbDir = path.dirname(config.db.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.db.path);

db.exec(`
  CREATE TABLE IF NOT EXISTS change_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    kb_article_id TEXT,
    kb_article_title TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    submitter TEXT,
    submit_time TEXT NOT NULL,
    approver TEXT,
    approve_time TEXT,
    version TEXT,
    raw_data TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_no, version)
  );

  CREATE TABLE IF NOT EXISTS audit_opinions (
    id TEXT PRIMARY KEY,
    change_order_id TEXT NOT NULL,
    order_no TEXT NOT NULL,
    auditor TEXT NOT NULL,
    opinion TEXT NOT NULL,
    result TEXT NOT NULL,
    audit_time TEXT NOT NULL,
    raw_data TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (change_order_id) REFERENCES change_orders(id)
  );

  CREATE TABLE IF NOT EXISTS agent_quote_records (
    id TEXT PRIMARY KEY,
    kb_article_id TEXT NOT NULL,
    kb_article_title TEXT,
    kb_version TEXT,
    agent_id TEXT NOT NULL,
    agent_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    quote_time TEXT NOT NULL,
    conversation_id TEXT,
    session_id TEXT,
    quote_content TEXT,
    order_no TEXT,
    raw_data TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS supplier_statements (
    id TEXT PRIMARY KEY,
    statement_no TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT,
    kb_article_id TEXT,
    kb_article_title TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'CNY',
    statement_date TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    status TEXT DEFAULT 'pending',
    raw_data TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(statement_no, supplier_id)
  );

  CREATE TABLE IF NOT EXISTS audit_trails (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    action_subtype TEXT,
    operator TEXT,
    status TEXT NOT NULL,
    detail TEXT,
    source_file TEXT,
    record_count INTEGER,
    error_message TEXT,
    request_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dirty_records (
    id TEXT PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    dirty_type TEXT NOT NULL,
    field_name TEXT,
    expected_value TEXT,
    actual_value TEXT,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    status TEXT NOT NULL DEFAULT 'pending',
    handler TEXT,
    handle_opinion TEXT,
    handle_time TEXT,
    raw_data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS data_versions (
    id TEXT PRIMARY KEY,
    record_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    data_snapshot TEXT NOT NULL,
    changer TEXT,
    change_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS approval_emails (
    id TEXT PRIMARY KEY,
    change_order_id TEXT,
    order_no TEXT,
    email_from TEXT NOT NULL,
    email_to TEXT,
    email_cc TEXT,
    subject TEXT NOT NULL,
    content TEXT,
    send_time TEXT NOT NULL,
    approval_result TEXT,
    raw_data TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_change_orders_order_no ON change_orders(order_no);
  CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
  CREATE INDEX IF NOT EXISTS idx_audit_opinions_order_no ON audit_opinions(order_no);
  CREATE INDEX IF NOT EXISTS idx_agent_quote_kb_id ON agent_quote_records(kb_article_id);
  CREATE INDEX IF NOT EXISTS idx_agent_quote_agent_id ON agent_quote_records(agent_id);
  CREATE INDEX IF NOT EXISTS idx_agent_quote_time ON agent_quote_records(quote_time);
  CREATE INDEX IF NOT EXISTS idx_supplier_statements_no ON supplier_statements(statement_no);
  CREATE INDEX IF NOT EXISTS idx_supplier_statements_date ON supplier_statements(statement_date);
  CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON audit_trails(action_type, created_at);
  CREATE INDEX IF NOT EXISTS idx_dirty_records_type ON dirty_records(dirty_type);
  CREATE INDEX IF NOT EXISTS idx_dirty_records_status ON dirty_records(status);
  CREATE INDEX IF NOT EXISTS idx_data_versions_record ON data_versions(record_type, record_id, version);
`);

console.log('数据库初始化完成');
db.close();
