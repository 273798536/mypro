
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'store-value-queue.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDatabase(): void {
  const database = getDatabase();
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS queue_task (
      id VARCHAR(36) PRIMARY KEY,
      source_type VARCHAR(50) NOT NULL,
      source_file VARCHAR(255) NOT NULL,
      source_line INTEGER NOT NULL,
      raw_data TEXT NOT NULL,
      standard_data TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    );
    
    CREATE INDEX IF NOT EXISTS idx_status ON queue_task(status);
    CREATE INDEX IF NOT EXISTS idx_source ON queue_task(source_type, source_file);
    
    CREATE TABLE IF NOT EXISTS operation_history (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NOT NULL,
      operation VARCHAR(50) NOT NULL,
      operator VARCHAR(100) NOT NULL,
      before_state TEXT,
      after_state TEXT,
      diff TEXT,
      remark TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES queue_task(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_history_task_id ON operation_history(task_id);
    
    CREATE TABLE IF NOT EXISTS original_evidence (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_hash VARCHAR(64) NOT NULL,
      original_content TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES queue_task(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON original_evidence(task_id);
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
