import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "consignment.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS consignments (
      id TEXT PRIMARY KEY,
      consignment_no TEXT UNIQUE NOT NULL,
      seller_name TEXT NOT NULL,
      seller_contact TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_brand TEXT NOT NULL,
      item_category TEXT NOT NULL,
      item_condition TEXT NOT NULL,
      listed_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appraisal_records (
      id TEXT PRIMARY KEY,
      consignment_id TEXT NOT NULL REFERENCES consignments(id),
      appraisal_date TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('passed', 'returned')),
      notes TEXT DEFAULT '',
      appraiser TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_orders (
      id TEXT PRIMARY KEY,
      sale_no TEXT UNIQUE NOT NULL,
      consignment_id TEXT NOT NULL REFERENCES consignments(id),
      sale_price REAL NOT NULL,
      sale_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
      cancelled_at TEXT,
      cancel_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commission_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_price REAL NOT NULL DEFAULT 0,
      max_price REAL NOT NULL DEFAULT 999999999,
      rate REAL NOT NULL,
      fixed_fee REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      consignment_id TEXT NOT NULL REFERENCES consignments(id),
      sale_order_id TEXT NOT NULL REFERENCES sale_orders(id),
      sale_price REAL NOT NULL,
      commission_rule_id TEXT REFERENCES commission_rules(id),
      commission_rate REAL NOT NULL,
      commission_amount REAL NOT NULL,
      total_deductions REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'amended', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fee_deductions (
      id TEXT PRIMARY KEY,
      settlement_id TEXT NOT NULL REFERENCES settlements(id),
      type TEXT NOT NULL CHECK(type IN ('repair', 'appraisal', 'storage', 'other')),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlement_amendments (
      id TEXT PRIMARY KEY,
      settlement_id TEXT NOT NULL REFERENCES settlements(id),
      field TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      reason TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('settlement', 'consignment', 'sale_order', 'deduction')),
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'amend', 'cancel', 'deduct', 'confirm')),
      details TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_settlements_consignment ON settlements(consignment_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
    CREATE INDEX IF NOT EXISTS idx_appraisal_consignment ON appraisal_records(consignment_id);
    CREATE INDEX IF NOT EXISTS idx_sale_consignment ON sale_orders(consignment_id);
    CREATE INDEX IF NOT EXISTS idx_deduction_settlement ON fee_deductions(settlement_id);
    CREATE INDEX IF NOT EXISTS idx_amendment_settlement ON settlement_amendments(settlement_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  const count = (db.prepare("SELECT COUNT(*) as c FROM commission_rules").get() as { c: number }).c;
  if (count === 0) {
    seedCommissionRules(db);
  }
}

function seedCommissionRules(db: Database.Database): void {
  const insert = db.prepare(
    "INSERT INTO commission_rules (id, name, min_price, max_price, rate, fixed_fee) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const now = new Date().toISOString();
  insert.run("cr-001", "低档位佣金", 0, 10000, 0.15, 0);
  insert.run("cr-002", "中档位佣金", 10000, 50000, 0.12, 200);
  insert.run("cr-003", "高档位佣金", 50000, 200000, 0.10, 500);
  insert.run("cr-004", "顶级佣金", 200000, 999999999, 0.08, 1000);
}
