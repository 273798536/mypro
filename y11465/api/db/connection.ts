import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/app.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT UNIQUE NOT NULL,
      style_code TEXT NOT NULL,
      brand TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      duplicate_strategy TEXT NOT NULL DEFAULT 'IGNORE',
      frozen BOOLEAN NOT NULL DEFAULT 0,
      frozen_reason TEXT,
      frozen_at DATETIME,
      created_by TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_no TEXT NOT NULL,
      style_code TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      review_reason TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS fabric_tracks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      style_code TEXT NOT NULL,
      old_version INTEGER NOT NULL,
      new_version INTEGER NOT NULL,
      fabric_code TEXT NOT NULL,
      disposition TEXT NOT NULL,
      remark TEXT,
      recorded_by TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      document_id TEXT,
      batch_id TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      document_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      payload TEXT NOT NULL,
      error_message TEXT,
      error_type TEXT,
      next_retry_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_data TEXT,
      after_data TEXT,
      reason TEXT,
      operated_by TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );
  `);

  const indexCheck = database.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?");
  
  if (!indexCheck.get('idx_batches_status')) {
    database.exec(`
      CREATE INDEX idx_batches_status ON batches(status);
      CREATE INDEX idx_batches_style_code ON batches(style_code);
      CREATE INDEX idx_documents_batch_id ON documents(batch_id);
      CREATE INDEX idx_documents_type ON documents(document_type);
      CREATE INDEX idx_documents_status ON documents(status);
      CREATE INDEX idx_tasks_status ON tasks(status);
      CREATE INDEX idx_tasks_next_retry ON tasks(next_retry_at);
      CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX idx_audit_created ON audit_logs(created_at);
    `);
  }
}

export default getDb;
