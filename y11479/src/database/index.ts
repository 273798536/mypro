import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'meeting-ledger.db');

let db: sqlite3.Database | null = null;

export function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      }
    });
  }
  return db;
}

export function runQuery(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(this: any, err: Error | null) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function initDatabase(): Promise<void> {
  const database = getDatabase();

  const statements = [
    `CREATE TABLE IF NOT EXISTS meeting_ledger (
      id TEXT PRIMARY KEY,
      meeting_id TEXT UNIQUE NOT NULL,
      meeting_title TEXT NOT NULL,
      room_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      organizer TEXT NOT NULL,
      participants TEXT NOT NULL,
      status TEXT NOT NULL,
      has_tea_break INTEGER NOT NULL DEFAULT 0,
      has_equipment INTEGER NOT NULL DEFAULT 0,
      tea_break_cost REAL NOT NULL DEFAULT 0,
      equipment_cost REAL NOT NULL DEFAULT 0,
      is_canceled INTEGER NOT NULL DEFAULT 0,
      cancel_time TEXT,
      cancel_reason TEXT,
      data_sources TEXT NOT NULL,
      customer_service_notes TEXT NOT NULL,
      access_records TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS change_record (
      id TEXT PRIMARY KEY,
      ledger_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      before_data TEXT NOT NULL,
      after_data TEXT NOT NULL,
      diff_summary TEXT NOT NULL,
      changed_fields TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      success INTEGER NOT NULL,
      deny_reason TEXT,
      request_data TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS async_task (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      result TEXT,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_meeting_id ON meeting_ledger(meeting_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_status ON meeting_ledger(status)`,
    `CREATE INDEX IF NOT EXISTS idx_change_ledger_id ON change_record(ledger_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_task_status ON async_task(status)`
  ];

  for (const sql of statements) {
    await runQuery(sql);
  }

  console.log('Database initialized successfully');
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
