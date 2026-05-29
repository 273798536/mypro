import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data', 'custody.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  const fs = require('fs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS wallet_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      chain TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      group_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(address, chain)
    );

    CREATE TABLE IF NOT EXISTS chain_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      chain TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      amount TEXT NOT NULL,
      block_timestamp TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tx_hash, chain)
    );

    CREATE TABLE IF NOT EXISTS exchange_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exchange_name TEXT NOT NULL,
      asset_symbol TEXT NOT NULL,
      amount TEXT NOT NULL,
      bill_type TEXT NOT NULL,
      bill_date TEXT NOT NULL,
      reference_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_symbol TEXT NOT NULL,
      price_usd TEXT NOT NULL,
      snapshot_date TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(token_symbol, snapshot_date, source)
    );

    CREATE TABLE IF NOT EXISTS gas_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      gas_used TEXT NOT NULL,
      gas_price_gwei TEXT NOT NULL,
      fee_native TEXT NOT NULL,
      fee_usd TEXT,
      block_timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tx_hash, chain)
    );

    CREATE TABLE IF NOT EXISTS monthly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_month TEXT NOT NULL,
      total_assets_usd TEXT NOT NULL DEFAULT '0',
      total_gas_usd TEXT NOT NULL DEFAULT '0',
      total_income_usd TEXT NOT NULL DEFAULT '0',
      anomaly_flags TEXT NOT NULL DEFAULT '[]',
      branch_type TEXT,
      summary TEXT NOT NULL DEFAULT '',
      wallet_snapshot_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(report_month)
    );

    CREATE TABLE IF NOT EXISTS anomaly_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      anomaly_type TEXT NOT NULL,
      description TEXT NOT NULL,
      related_ids TEXT NOT NULL DEFAULT '[]',
      severity TEXT NOT NULL DEFAULT 'warning',
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES monthly_reports(id)
    );

    CREATE TABLE IF NOT EXISTS wallet_conclusion_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      field_changed TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      reason TEXT NOT NULL,
      trigger_source TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (wallet_id) REFERENCES wallet_addresses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_wallet_group ON wallet_addresses(group_id);
    CREATE INDEX IF NOT EXISTS idx_transfer_from ON chain_transfers(from_address);
    CREATE INDEX IF NOT EXISTS idx_transfer_to ON chain_transfers(to_address);
    CREATE INDEX IF NOT EXISTS idx_transfer_chain ON chain_transfers(chain);
    CREATE INDEX IF NOT EXISTS idx_price_token_date ON price_snapshots(token_symbol, snapshot_date);
    CREATE INDEX IF NOT EXISTS idx_gas_chain ON gas_fees(chain);
    CREATE INDEX IF NOT EXISTS idx_anomaly_report ON anomaly_records(report_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly_records(anomaly_type);
    CREATE INDEX IF NOT EXISTS idx_conclusion_wallet ON wallet_conclusion_changes(wallet_id);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
