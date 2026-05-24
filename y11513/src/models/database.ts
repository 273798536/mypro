import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

export class Database {
  private static instance: Database | null = null;
  private db: sqlite3.Database;

  private constructor() {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(config.database.path);
    this.initializeTables();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initializeTables(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS borrow_applications (
        id TEXT PRIMARY KEY,
        application_no TEXT UNIQUE NOT NULL,
        business_key TEXT UNIQUE NOT NULL,
        reader_id TEXT NOT NULL,
        reader_name TEXT NOT NULL,
        isbn TEXT NOT NULL,
        book_title TEXT NOT NULL,
        applicant_library TEXT NOT NULL,
        lending_library TEXT NOT NULL,
        application_date INTEGER NOT NULL,
        status TEXT NOT NULL,
        expected_return_date INTEGER NOT NULL,
        actual_return_date INTEGER,
        processing_reason TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        source_file TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        raw_value TEXT NOT NULL,
        parsed_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS express_orders (
        id TEXT PRIMARY KEY,
        express_no TEXT UNIQUE NOT NULL,
        business_key TEXT UNIQUE NOT NULL,
        related_application_no TEXT NOT NULL,
        sender TEXT NOT NULL,
        receiver TEXT NOT NULL,
        send_date INTEGER NOT NULL,
        receive_date INTEGER,
        express_company TEXT NOT NULL,
        freight REAL NOT NULL,
        status TEXT NOT NULL,
        processing_reason TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        source_file TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        raw_value TEXT NOT NULL,
        parsed_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS compensation_records (
        id TEXT PRIMARY KEY,
        compensation_no TEXT UNIQUE NOT NULL,
        business_key TEXT UNIQUE NOT NULL,
        related_application_no TEXT NOT NULL,
        reader_id TEXT NOT NULL,
        compensation_type TEXT NOT NULL,
        amount REAL NOT NULL,
        compensation_date INTEGER NOT NULL,
        status TEXT NOT NULL,
        remark TEXT,
        processing_reason TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        source_file TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        raw_value TEXT NOT NULL,
        parsed_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shift_records (
        id TEXT PRIMARY KEY,
        shift_no TEXT UNIQUE NOT NULL,
        business_key TEXT UNIQUE NOT NULL,
        operator_id TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        shift_date INTEGER NOT NULL,
        shift_type TEXT NOT NULL,
        processed_records INTEGER NOT NULL,
        remark TEXT,
        processing_reason TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        source_file TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        raw_value TEXT NOT NULL,
        parsed_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS async_tasks (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        record_type TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        next_retry_at INTEGER,
        last_error TEXT,
        processed_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history_records (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        record_type TEXT NOT NULL,
        operation TEXT NOT NULL,
        operator TEXT NOT NULL,
        before_change TEXT,
        after_change TEXT,
        change_reason TEXT NOT NULL,
        source_file TEXT,
        original_line_number INTEGER,
        raw_value TEXT,
        parsed_value TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_borrow_app_no ON borrow_applications(application_no);
      CREATE INDEX IF NOT EXISTS idx_borrow_business_key ON borrow_applications(business_key);
      CREATE INDEX IF NOT EXISTS idx_express_no ON express_orders(express_no);
      CREATE INDEX IF NOT EXISTS idx_express_business_key ON express_orders(business_key);
      CREATE INDEX IF NOT EXISTS idx_compensation_no ON compensation_records(compensation_no);
      CREATE INDEX IF NOT EXISTS idx_compensation_business_key ON compensation_records(business_key);
      CREATE INDEX IF NOT EXISTS idx_shift_no ON shift_records(shift_no);
      CREATE INDEX IF NOT EXISTS idx_shift_business_key ON shift_records(business_key);
      CREATE INDEX IF NOT EXISTS idx_task_status ON async_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_task_record ON async_tasks(record_id, record_type);
      CREATE INDEX IF NOT EXISTS idx_history_record ON history_records(record_id, record_type);
      CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_records(timestamp);
    `;

    this.db.exec(sql, (err) => {
      if (err) {
        logger.error('Failed to initialize database tables', err);
      } else {
        logger.info('Database tables initialized successfully');
      }
    });
  }

  public getDb(): sqlite3.Database {
    return this.db;
  }

  public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  public get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  public all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const db = Database.getInstance();
