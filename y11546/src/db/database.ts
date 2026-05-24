import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

sqlite3.verbose();

export class DatabaseManager {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor(workDir: string = process.cwd()) {
    const dataDir = path.join(workDir, '.ema-data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'exhibition-material.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTables();
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  getDbPath(): string {
    return this.dbPath;
  }

  private initTables(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        strategy TEXT NOT NULL,
        total_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        operator TEXT NOT NULL,
        import_time TEXT NOT NULL,
        remark TEXT
      );

      CREATE TABLE IF NOT EXISTS material_items (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_batch_id TEXT NOT NULL,
        original_line_no INTEGER NOT NULL,
        material_code TEXT NOT NULL,
        material_name TEXT NOT NULL,
        specification TEXT,
        quantity INTEGER NOT NULL,
        unit TEXT NOT NULL,
        warehouse TEXT,
        location TEXT,
        batch_no TEXT,
        responsible_person TEXT,
        department TEXT,
        remark TEXT,
        import_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_material_code ON material_items(material_code);
      CREATE INDEX IF NOT EXISTS idx_material_batch ON material_items(source_batch_id);

      CREATE TABLE IF NOT EXISTS logistics_receipts (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_batch_id TEXT NOT NULL,
        original_line_no INTEGER NOT NULL,
        waybill_no TEXT NOT NULL,
        material_code TEXT NOT NULL,
        material_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit TEXT NOT NULL,
        sender TEXT,
        receiver TEXT,
        receive_time TEXT,
        receive_address TEXT,
        sign_status TEXT,
        remark TEXT,
        import_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_logistics_code ON logistics_receipts(material_code);
      CREATE INDEX IF NOT EXISTS idx_logistics_batch ON logistics_receipts(source_batch_id);

      CREATE TABLE IF NOT EXISTS on_site_borrows (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_batch_id TEXT NOT NULL,
        original_line_no INTEGER NOT NULL,
        borrow_no TEXT NOT NULL,
        material_code TEXT NOT NULL,
        material_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit TEXT NOT NULL,
        borrower TEXT NOT NULL,
        borrower_department TEXT,
        borrow_time TEXT,
        expected_return_time TEXT,
        actual_return_time TEXT,
        return_status TEXT,
        keeper TEXT,
        remark TEXT,
        import_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_borrow_code ON on_site_borrows(material_code);
      CREATE INDEX IF NOT EXISTS idx_borrow_batch ON on_site_borrows(source_batch_id);
      CREATE INDEX IF NOT EXISTS idx_borrow_status ON on_site_borrows(return_status);

      CREATE TABLE IF NOT EXISTS inventory_diffs (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_batch_id TEXT NOT NULL,
        original_line_no INTEGER NOT NULL,
        material_code TEXT NOT NULL,
        material_name TEXT NOT NULL,
        expected_quantity INTEGER NOT NULL,
        actual_quantity INTEGER NOT NULL,
        diff_quantity INTEGER NOT NULL,
        unit TEXT NOT NULL,
        diff_type TEXT NOT NULL,
        check_time TEXT,
        checker TEXT,
        reason TEXT,
        remark TEXT,
        import_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_diff_code ON inventory_diffs(material_code);
      CREATE INDEX IF NOT EXISTS idx_diff_batch ON inventory_diffs(source_batch_id);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        action TEXT NOT NULL,
        material_code TEXT NOT NULL,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        operator TEXT NOT NULL,
        operate_time TEXT NOT NULL,
        original_line_no INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_audit_batch ON audit_logs(batch_id);
      CREATE INDEX IF NOT EXISTS idx_audit_code ON audit_logs(material_code);
      CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(operate_time);

      CREATE TABLE IF NOT EXISTS failed_records (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        original_line_no INTEGER NOT NULL,
        material_code TEXT,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        fixed_by TEXT,
        fixed_time TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_failed_batch ON failed_records(batch_id);
      CREATE INDEX IF NOT EXISTS idx_failed_status ON failed_records(status);

      CREATE TABLE IF NOT EXISTS async_tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        batch_id TEXT,
        status TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        next_retry_at TEXT,
        operator TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_task_status ON async_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_task_type ON async_tasks(type);

      CREATE TABLE IF NOT EXISTS check_results (
        id TEXT PRIMARY KEY,
        check_time TEXT NOT NULL,
        source_type TEXT NOT NULL,
        total_count INTEGER NOT NULL,
        consistent_count INTEGER NOT NULL,
        diff_count INTEGER NOT NULL,
        issues TEXT
      );

      CREATE TABLE IF NOT EXISTS material_history (
        id TEXT PRIMARY KEY,
        material_code TEXT NOT NULL,
        source_type TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        change_type TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        batch_id TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_history_code ON material_history(material_code);
      CREATE INDEX IF NOT EXISTS idx_history_time ON material_history(changed_at);
    `;

    this.db.exec(sql);
  }

  prepare(sql: string): sqlite3.Statement {
    return this.db.prepare(sql);
  }

  run(sql: string, params?: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params || [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params || [], (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params || [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  generateId(): string {
    return uuidv4();
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

let dbInstance: DatabaseManager | null = null;

export function getDatabase(workDir?: string): DatabaseManager {
  if (!dbInstance) {
    dbInstance = new DatabaseManager(workDir);
  }
  return dbInstance;
}
