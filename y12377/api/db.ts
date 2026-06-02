import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'instrument-rental.db');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const DDL_SQL = `
CREATE TABLE IF NOT EXISTS rental_contracts (
  id TEXT PRIMARY KEY,
  contract_no TEXT UNIQUE NOT NULL,
  instrument_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  deposit_amount REAL NOT NULL DEFAULT 0,
  monthly_rent REAL NOT NULL DEFAULT 0,
  actual_deposit_received REAL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instrument_changes (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  old_instrument_no TEXT NOT NULL,
  new_instrument_no TEXT NOT NULL,
  work_order_id TEXT,
  reason TEXT,
  operator TEXT NOT NULL,
  operated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_work_orders (
  id TEXT PRIMARY KEY,
  work_order_no TEXT UNIQUE NOT NULL,
  contract_id TEXT NOT NULL,
  instrument_no TEXT NOT NULL,
  total_cost REAL NOT NULL DEFAULT 0,
  has_dispute INTEGER NOT NULL DEFAULT 0,
  dispute_note TEXT,
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_items (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  is_disputed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reconciliation_statements (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  contract_no TEXT NOT NULL,
  instrument_no TEXT NOT NULL,
  rent_amount REAL NOT NULL DEFAULT 0,
  repair_cost REAL NOT NULL DEFAULT 0,
  deposit_deduction REAL NOT NULL DEFAULT 0,
  actual_received REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discrepancy_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  related_contract_no TEXT NOT NULL,
  related_work_order_no TEXT,
  related_field TEXT,
  contract_value TEXT,
  statement_value TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_no ON rental_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON rental_contracts(status);
CREATE INDEX IF NOT EXISTS idx_changes_contract ON instrument_changes(contract_id);
CREATE INDEX IF NOT EXISTS idx_orders_contract ON repair_work_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_orders_dispute ON repair_work_orders(has_dispute);
CREATE INDEX IF NOT EXISTS idx_alerts_contract ON discrepancy_alerts(related_contract_no);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON discrepancy_alerts(resolved);
`;

const INIT_DATA_SQL = `
INSERT OR IGNORE INTO rental_contracts (id, contract_no, instrument_no, customer_name, start_date, deposit_amount, monthly_rent, actual_deposit_received, status) VALUES
('c-001', 'HT202405001', 'YAMAHA-U1-015', '李明', '2024-05-10', 8000, 1200, 8000, 'ACTIVE'),
('c-002', 'HT202405002', 'STEINWAY-D-008', '王芳', '2024-05-15', 20000, 3500, 19000, 'ACTIVE'),
('c-003', 'HT202406001', 'YAMAHA-C7-023', '张伟', '2024-06-01', 5000, 800, 5000, 'PENDING');

INSERT OR IGNORE INTO instrument_changes (id, contract_id, old_instrument_no, new_instrument_no, reason, operator) VALUES
('ch-001', 'c-001', 'YAMAHA-U1-015', 'YAMAHA-U1-022', '原琴调音故障临时更换', '赵管理员');

INSERT OR IGNORE INTO repair_work_orders (id, work_order_no, contract_id, instrument_no, total_cost, has_dispute, dispute_note) VALUES
('w-001', 'WX202405001', 'c-001', 'YAMAHA-U1-015', 450, 1, '客户认为琴键修复费用应包含在租金内'),
('w-002', 'WX202406001', 'c-002', 'STEINWAY-D-008', 1200, 0, NULL);

INSERT OR IGNORE INTO repair_items (id, work_order_id, name, cost, is_disputed) VALUES
('i-001', 'w-001', '更换琴槌', 200, 0),
('i-002', 'w-001', '琴键修复', 250, 1),
('i-003', 'w-002', '钢琴调律', 800, 0),
('i-004', 'w-002', '内部清洁', 400, 0);

INSERT OR IGNORE INTO reconciliation_statements (id, period, contract_no, instrument_no, rent_amount, repair_cost, deposit_deduction, actual_received) VALUES
('s-001', '2024-05', 'HT202405001', 'YAMAHA-U1-015', 1200, 450, 0, 1650),
('s-002', '2024-05', 'HT202405002', 'STEINWAY-D-008', 3500, 0, 1000, 2500);
`;

async function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    db.run(DDL_SQL);
    db.run(INIT_DATA_SQL);
    saveDatabase();
  }

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function runQuery(sql: string, params: any[] = []): any[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function runExecute(sql: string, params: any[] = []): void {
  const database = getDb();
  database.run(sql, params);
  saveDatabase();
}

export function runTransaction(operations: { sql: string; params: any[] }[]): void {
  const database = getDb();
  database.run('BEGIN TRANSACTION');
  try {
    for (const op of operations) {
      database.run(op.sql, op.params);
    }
    database.run('COMMIT');
    saveDatabase();
  } catch (e) {
    database.run('ROLLBACK');
    throw e;
  }
}
