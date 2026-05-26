const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'arbitration.db');
let db;

function init() {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS split_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_version TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      merchant_ratio REAL NOT NULL DEFAULT 0,
      platform_ratio REAL NOT NULL DEFAULT 0,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(rule_version, merchant_id)
    );

    CREATE TABLE IF NOT EXISTS merchant_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      merchant_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      settle_date TEXT NOT NULL,
      rule_version TEXT NOT NULL,
      platform_subsidy REAL NOT NULL DEFAULT 0,
      subsidy_batch_no TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refund_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refund_no TEXT UNIQUE NOT NULL,
      order_no TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      refund_amount REAL NOT NULL DEFAULT 0,
      refund_date TEXT NOT NULL,
      settle_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_no) REFERENCES merchant_orders(order_no)
    );

    CREATE TABLE IF NOT EXISTS platform_subsidies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subsidy_batch_no TEXT NOT NULL,
      order_no TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      subsidy_amount REAL NOT NULL DEFAULT 0,
      granted_date TEXT NOT NULL,
      settle_date TEXT NOT NULL,
      is_reversed INTEGER NOT NULL DEFAULT 0,
      reversed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS arbitration_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_no TEXT UNIQUE NOT NULL,
      merchant_id TEXT NOT NULL,
      order_no TEXT,
      complaint_source TEXT NOT NULL,
      complaint_detail TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      current_handler TEXT,
      arbitration_opinion TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS arbitration_status_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_no TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      operator TEXT NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_no) REFERENCES arbitration_cases(case_no)
    );

    CREATE TABLE IF NOT EXISTS arbitration_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_no TEXT NOT NULL,
      correction_type TEXT NOT NULL,
      target_record TEXT NOT NULL,
      original_value TEXT,
      corrected_value TEXT NOT NULL,
      operator TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_no) REFERENCES arbitration_cases(case_no)
    );

    CREATE TABLE IF NOT EXISTS settlement_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_no TEXT UNIQUE NOT NULL,
      merchant_id TEXT NOT NULL,
      settle_date TEXT NOT NULL,
      order_total REAL NOT NULL DEFAULT 0,
      refund_total REAL NOT NULL DEFAULT 0,
      subsidy_total REAL NOT NULL DEFAULT 0,
      merchant_settlement REAL NOT NULL DEFAULT 0,
      platform_income REAL NOT NULL DEFAULT 0,
      is_final INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS balance_rollback_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_no TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      rollback_amount REAL NOT NULL DEFAULT 0,
      direction TEXT NOT NULL,
      target_settle_date TEXT NOT NULL,
      reason TEXT,
      operator TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_no) REFERENCES arbitration_cases(case_no)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_no TEXT,
      anomaly_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      description TEXT NOT NULL,
      related_order TEXT,
      related_refund TEXT,
      related_subsidy TEXT,
      extra_info TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_no) REFERENCES arbitration_cases(case_no)
    );
  `);

  console.log('[DB] 数据库初始化完成');
  return db;
}

function getDb() {
  if (!db) init();
  return db;
}

module.exports = { init, getDb };
