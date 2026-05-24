import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { logger } from '../utils/logger';

const DB_PATH = process.env.DB_PATH || './data/database.sqlite';

export class Database {
  private static instance: Database;
  private db: sqlite3.Database;

  private constructor() {
    const dbDir = path.dirname(DB_PATH);
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Failed to connect to database:', err);
        throw err;
      }
      logger.info('Connected to SQLite database');
      this.initializeTables();
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initializeTables(): void {
    const sqlStatements = [
      `CREATE TABLE IF NOT EXISTS reconciliation_receipts (
        id TEXT PRIMARY KEY,
        batch_no TEXT NOT NULL,
        semi_product_code TEXT NOT NULL,
        semi_product_name TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        status TEXT NOT NULL,
        current_status TEXT NOT NULL,
        status_before_frozen TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        abnormal_amount REAL NOT NULL DEFAULT 0,
        deduction_amount REAL NOT NULL DEFAULT 0,
        confirmed_amount REAL NOT NULL DEFAULT 0,
        customer_service_notes TEXT,
        manual_reason TEXT,
        is_manual_modified INTEGER NOT NULL DEFAULT 0,
        frozen_by_id TEXT,
        frozen_by_name TEXT,
        frozen_by_role TEXT,
        frozen_at TEXT,
        frozen_reason TEXT,
        created_by_id TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_by_role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_by_id TEXT,
        updated_by_name TEXT,
        updated_by_role TEXT,
        updated_at TEXT,
        archived_by_id TEXT,
        archived_by_name TEXT,
        archived_by_role TEXT,
        archived_at TEXT,
        version INTEGER NOT NULL DEFAULT 1
      )`,

      `CREATE TABLE IF NOT EXISTS status_transitions (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        operator_id TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        operator_role TEXT NOT NULL,
        reason TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (receipt_id) REFERENCES reconciliation_receipts(id)
      )`,

      `CREATE TABLE IF NOT EXISTS original_evidences (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_file TEXT NOT NULL,
        original_line_number INTEGER NOT NULL,
        original_value TEXT NOT NULL,
        parsed_value TEXT NOT NULL,
        field_name TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        import_batch_id TEXT NOT NULL,
        FOREIGN KEY (receipt_id) REFERENCES reconciliation_receipts(id)
      )`,

      `CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        uploaded_by_id TEXT NOT NULL,
        uploaded_by_name TEXT NOT NULL,
        uploaded_by_role TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (receipt_id) REFERENCES reconciliation_receipts(id)
      )`,

      `CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        source_file TEXT NOT NULL,
        source_type TEXT NOT NULL,
        total_records INTEGER NOT NULL,
        success_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        imported_by_id TEXT NOT NULL,
        imported_by_name TEXT NOT NULL,
        imported_by_role TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        error_details TEXT
      )`,

      `CREATE INDEX IF NOT EXISTS idx_receipts_batch_no ON reconciliation_receipts(batch_no)`,
      `CREATE INDEX IF NOT EXISTS idx_receipts_status ON reconciliation_receipts(status)`,
      `CREATE INDEX IF NOT EXISTS idx_receipts_supplier ON reconciliation_receipts(supplier_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transitions_receipt ON status_transitions(receipt_id)`,
      `CREATE INDEX IF NOT EXISTS idx_evidences_receipt ON original_evidences(receipt_id)`,
      `CREATE INDEX IF NOT EXISTS idx_evidences_batch ON original_evidences(import_batch_id)`
    ];

    let index = 0;
    const executeNext = () => {
      if (index < sqlStatements.length) {
        this.db.run(sqlStatements[index], (err) => {
          if (err) {
            logger.error('Failed to create table:', err);
          }
          index++;
          executeNext();
        });
      } else {
        logger.info('All tables initialized successfully');
      }
    };
    executeNext();
  }

  public getConnection(): sqlite3.Database {
    return this.db;
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: any; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('SQL error:', err, sql);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  public get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('SQL error:', err, sql);
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  public all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('SQL error:', err, sql);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          logger.error('Failed to close database:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
