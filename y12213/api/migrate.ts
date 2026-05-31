import { getDb } from './db.js'

export function initDatabase(): void {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      qualification_status TEXT NOT NULL DEFAULT 'valid',
      contact_person TEXT,
      contact_phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      contract_no TEXT NOT NULL UNIQUE,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      guarantee_no TEXT,
      guarantee_amount REAL,
      guarantee_expiry_date TEXT,
      quota_used REAL NOT NULL DEFAULT 0,
      quota_total REAL NOT NULL DEFAULT 0,
      quota_manually_modified INTEGER NOT NULL DEFAULT 0,
      extend_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      level TEXT NOT NULL CHECK(level IN ('expired','urgent','warning','normal')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed')),
      confirmed_by TEXT,
      confirmed_at TEXT,
      remark TEXT,
      remark_modified_by TEXT,
      remark_modified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS histories (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL CHECK(target_type IN ('warning','contract','supplier')),
      target_id TEXT NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('confirm','remark_modify','extend','extend_blocked','quota_modify')),
      operator TEXT NOT NULL,
      before_value TEXT,
      after_value TEXT,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quota_modifications (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      before_amount REAL NOT NULL,
      after_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      operator TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_warnings_contract ON warnings(contract_id);
    CREATE INDEX IF NOT EXISTS idx_warnings_status ON warnings(status);
    CREATE INDEX IF NOT EXISTS idx_warnings_level ON warnings(level);
    CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON contracts(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_histories_target ON histories(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_quota_mods_contract ON quota_modifications(contract_id);
  `)
}
