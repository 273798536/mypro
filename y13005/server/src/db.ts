import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data.db');
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT NOT NULL UNIQUE,
      batch_name TEXT NOT NULL,
      abs_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      reviewer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      receipt_no TEXT,
      raw_data TEXT NOT NULL,
      trustee_name TEXT,
      payer TEXT,
      amount REAL,
      currency TEXT,
      expected_currency TEXT,
      receipt_date TEXT,
      remark TEXT,
      is_currency_anomaly INTEGER DEFAULT 0,
      source_file TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      reviewer TEXT,
      initial_conclusion TEXT,
      manual_conclusion TEXT,
      is_manual_override INTEGER DEFAULT 0,
      override_reason TEXT,
      override_impact TEXT,
      status TEXT DEFAULT 'pending',
      needs_material TEXT,
      supplementary_material TEXT,
      review_guidance TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_record_id INTEGER NOT NULL,
      receipt_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      old_conclusion TEXT,
      new_conclusion TEXT,
      old_status TEXT,
      new_status TEXT,
      change_reason TEXT,
      changed_by TEXT,
      supplementary_material_added TEXT,
      new_note TEXT,
      snapshot_before TEXT,
      snapshot_after TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (review_record_id) REFERENCES review_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS currency_anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      detected_currency TEXT,
      expected_currency TEXT,
      amount REAL,
      description TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    );
  `);
}
