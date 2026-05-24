import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config';

export class Database {
  private static instance: sqlite3.Database | null = null;

  static getInstance(): sqlite3.Database {
    if (!Database.instance) {
      const dbDir = path.dirname(config.db.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      Database.instance = new sqlite3.Database(config.db.path, (err) => {
        if (err) {
          console.error('Failed to open database:', err);
          throw err;
        }
        console.log('Database connected successfully');
      });

      Database.initializeTables(Database.instance);
    }
    return Database.instance;
  }

  private static initializeTables(db: sqlite3.Database): void {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS compensation_facts (
        fact_id TEXT PRIMARY KEY,
        idempotency_key TEXT UNIQUE NOT NULL,
        batch_id TEXT NOT NULL,
        city TEXT NOT NULL,
        cabinet_inventory TEXT NOT NULL,
        replenish_photos TEXT NOT NULL,
        refund_records TEXT NOT NULL,
        external_receipts TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        retry_category TEXT,
        last_retry_at TEXT,
        next_retry_at TEXT,
        assigned_to TEXT,
        frozen INTEGER DEFAULT 0,
        frozen_at TEXT,
        frozen_by TEXT,
        frozen_until TEXT,
        compensated_at TEXT,
        compensated_by TEXT,
        closed_at TEXT,
        closed_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        remarks TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS compensation_queue (
        queue_id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_category TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER NOT NULL,
        last_attempt_at TEXT,
        last_error TEXT,
        next_attempt_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (fact_id) REFERENCES compensation_facts(fact_id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        log_id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        operator_id TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        change_summary TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_facts_idempotency ON compensation_facts(idempotency_key)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_facts_batch ON compensation_facts(batch_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_facts_status ON compensation_facts(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_facts_city ON compensation_facts(city)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_next_attempt ON compensation_queue(next_attempt_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_status ON compensation_queue(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_fact ON audit_logs(fact_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);

      console.log('Database tables initialized');
    });
  }

  static runAsync(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      Database.getInstance().run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  static getAsync<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      Database.getInstance().get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  static allAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      Database.getInstance().all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  static close(): void {
    if (Database.instance) {
      Database.instance.close();
      Database.instance = null;
    }
  }
}
