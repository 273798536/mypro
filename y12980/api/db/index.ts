import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'ledger.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeTables(db);
  }
  return db;
}

function initializeTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('SLOW_QUERY_LOG', 'SCHEMA_SNAPSHOT')),
      total_records INTEGER NOT NULL DEFAULT 0,
      new_records INTEGER NOT NULL DEFAULT 0,
      duplicate_records INTEGER NOT NULL DEFAULT 0,
      anomaly_count INTEGER NOT NULL DEFAULT 0,
      imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      imported_by TEXT NOT NULL DEFAULT 'system'
    );

    CREATE TABLE IF NOT EXISTS ledger_records (
      id TEXT PRIMARY KEY,
      record_no TEXT NOT NULL UNIQUE,
      anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('SLOW_QUERY_CONFLICT', 'SCHEMA_CONFLICT', 'BACKUP_GAP', 'DUPLICATE_IMPORT', 'NONE')),
      status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'NEEDS_REVIEW', 'UNAVAILABLE')),
      source_file TEXT NOT NULL,
      original_line_no INTEGER NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('SLOW_QUERY_LOG', 'SCHEMA_SNAPSHOT')),
      import_batch_id TEXT NOT NULL,
      slow_query_sql TEXT,
      schema_snapshot TEXT,
      conflict_details TEXT,
      handling_opinion TEXT,
      business_notes TEXT,
      source_remark TEXT,
      image_name TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      handled_by TEXT,
      handled_at DATETIME,
      FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
    );

    CREATE TABLE IF NOT EXISTS migration_tasks (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
      total_records INTEGER NOT NULL DEFAULT 0,
      processed_records INTEGER NOT NULL DEFAULT 0,
      failed_records INTEGER NOT NULL DEFAULT 0,
      started_at DATETIME,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS backup_checks (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      backup_date DATE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('VERIFIED', 'MISSING', 'CORRUPTED')),
      expected_records INTEGER NOT NULL,
      actual_records INTEGER NOT NULL,
      gap_records INTEGER NOT NULL DEFAULT 0,
      checksum TEXT,
      UNIQUE(table_name, backup_date)
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_status ON ledger_records(status);
    CREATE INDEX IF NOT EXISTS idx_ledger_anomaly ON ledger_records(anomaly_type);
    CREATE INDEX IF NOT EXISTS idx_ledger_batch ON ledger_records(import_batch_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_source ON ledger_records(source_file);
    CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_checks(status);
    CREATE INDEX IF NOT EXISTS idx_migration_status ON migration_tasks(status);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
