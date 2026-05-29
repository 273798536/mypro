import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'refund.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS refund_cases (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    treatment_consumed REAL NOT NULL DEFAULT 0,
    platform_refund REAL NOT NULL DEFAULT 0,
    store_refund REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '待拆账',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS installment_contracts (
    id TEXT PRIMARY KEY,
    refund_case_id TEXT NOT NULL REFERENCES refund_cases(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL,
    contract_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    platform_fee REAL NOT NULL DEFAULT 0,
    platform_status TEXT NOT NULL DEFAULT '未结清',
    import_order INTEGER NOT NULL,
    imported_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS treatment_records (
    id TEXT PRIMARY KEY,
    refund_case_id TEXT NOT NULL REFERENCES refund_cases(id) ON DELETE CASCADE,
    treatment_name TEXT NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 0,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    consumed_amount REAL NOT NULL DEFAULT 0,
    import_order INTEGER NOT NULL,
    imported_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    refund_case_id TEXT NOT NULL REFERENCES refund_cases(id) ON DELETE CASCADE,
    coupon_name TEXT NOT NULL,
    coupon_amount REAL NOT NULL DEFAULT 0,
    is_recoverable INTEGER NOT NULL DEFAULT 0,
    is_late_entry INTEGER NOT NULL DEFAULT 0,
    import_order INTEGER NOT NULL,
    imported_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS pending_items (
    id TEXT PRIMARY KEY,
    refund_case_id TEXT NOT NULL REFERENCES refund_cases(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '待确认',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    confirmed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS platform_status_logs (
    id TEXT PRIMARY KEY,
    refund_case_id TEXT NOT NULL REFERENCES refund_cases(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    refund_case_id TEXT NOT NULL REFERENCES refund_cases(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_contracts_case ON installment_contracts(refund_case_id);
  CREATE INDEX IF NOT EXISTS idx_treatments_case ON treatment_records(refund_case_id);
  CREATE INDEX IF NOT EXISTS idx_coupons_case ON coupons(refund_case_id);
  CREATE INDEX IF NOT EXISTS idx_pending_case ON pending_items(refund_case_id);
  CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_items(status);
  CREATE INDEX IF NOT EXISTS idx_cases_status ON refund_cases(status);
  CREATE INDEX IF NOT EXISTS idx_status_logs_case ON platform_status_logs(refund_case_id);
  CREATE INDEX IF NOT EXISTS idx_op_logs_case ON operation_logs(refund_case_id);
`)

db.pragma('foreign_keys = ON')

export default db
