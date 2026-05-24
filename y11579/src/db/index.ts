import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

let dbInstance: sqlite3.Database | null = null;

export function getDB(): sqlite3.Database {
  if (dbInstance) return dbInstance;
  
  const dbPath = path.resolve(process.cwd(), config.database.path);
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  dbInstance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error('数据库连接失败:', err);
    }
  });
  
  dbInstance.run('PRAGMA foreign_keys = ON');
  
  return dbInstance;
}

export function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

export function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function initDB(): Promise<void> {
  const db = getDB();
  
  logger.info('开始初始化数据库...');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT PRIMARY KEY,
      batch_no TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_role TEXT NOT NULL,
      current_handler TEXT,
      reject_reason TEXT,
      process_result TEXT,
      process_message TEXT,
      sensitive_fields_masked INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      submitted_at TEXT,
      confirmed_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_ledgers_batch_no ON ledgers(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_ledgers_status ON ledgers(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ledgers_created_at ON ledgers(created_at)`,

    `CREATE TABLE IF NOT EXISTS delivery_notes (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      warehouse TEXT NOT NULL,
      receiver TEXT NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_delivery_notes_batch_no ON delivery_notes(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_delivery_notes_ledger_id ON delivery_notes(ledger_id)`,

    `CREATE TABLE IF NOT EXISTS rework_records (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      delivery_note_id TEXT NOT NULL,
      rework_reason TEXT NOT NULL,
      rework_type TEXT NOT NULL,
      rework_quantity REAL NOT NULL,
      rework_date TEXT NOT NULL,
      responsible_person TEXT NOT NULL,
      completion_date TEXT,
      result TEXT,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE,
      FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_rework_records_batch_no ON rework_records(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_rework_records_ledger_id ON rework_records(ledger_id)`,

    `CREATE TABLE IF NOT EXISTS deduction_details (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      delivery_note_id TEXT,
      rework_record_id TEXT,
      deduction_type TEXT NOT NULL,
      deduction_amount REAL NOT NULL,
      deduction_reason TEXT NOT NULL,
      deduction_date TEXT NOT NULL,
      operator TEXT NOT NULL,
      evidence_urls TEXT,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE,
      FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id),
      FOREIGN KEY (rework_record_id) REFERENCES rework_records(id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_deduction_details_batch_no ON deduction_details(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_deduction_details_ledger_id ON deduction_details(ledger_id)`,

    `CREATE TABLE IF NOT EXISTS handover_papers (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      delivery_note_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      store_name TEXT NOT NULL,
      handover_date TEXT NOT NULL,
      handover_person TEXT NOT NULL,
      receiver TEXT NOT NULL,
      items TEXT NOT NULL,
      remark TEXT,
      image_urls TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE,
      FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_handover_papers_batch_no ON handover_papers(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_handover_papers_ledger_id ON handover_papers(ledger_id)`,

    `CREATE TABLE IF NOT EXISTS sms_evidences (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      related_type TEXT NOT NULL,
      related_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      content TEXT NOT NULL,
      send_time TEXT NOT NULL,
      screenshot_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_sms_evidences_batch_no ON sms_evidences(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_sms_evidences_ledger_id ON sms_evidences(ledger_id)`,

    `CREATE TABLE IF NOT EXISTS change_history (
      id TEXT PRIMARY KEY,
      ledger_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT NOT NULL,
      changed_by_role TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      diff_summary TEXT,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_change_history_ledger_id ON change_history(ledger_id)`,
    `CREATE INDEX IF NOT EXISTS idx_change_history_changed_at ON change_history(changed_at)`,

    `CREATE TABLE IF NOT EXISTS ledger_snapshots (
      id TEXT PRIMARY KEY,
      ledger_id TEXT NOT NULL,
      ledger_data TEXT NOT NULL,
      status TEXT NOT NULL,
      snapshot_type TEXT NOT NULL,
      action TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_ledger_snapshots_ledger_id ON ledger_snapshots(ledger_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_snapshots_created_at ON ledger_snapshots(created_at)`,

    `CREATE TABLE IF NOT EXISTS async_tasks (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      error_stack TEXT,
      last_run_at TEXT,
      next_run_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    `CREATE INDEX IF NOT EXISTS idx_async_tasks_status ON async_tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_async_tasks_next_run_at ON async_tasks(next_run_at)`
  ];

  for (const sql of tables) {
    await run(sql);
  }
  
  logger.info('数据库初始化完成');
}
