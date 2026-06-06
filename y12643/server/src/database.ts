import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'app.db');

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS layers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      canvas_status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exceptions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      record_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      source TEXT,
      layer_id TEXT,
      status TEXT DEFAULT 'pending',
      color TEXT DEFAULT '#eab308',
      data TEXT,
      offline_missing INTEGER DEFAULT 0,
      is_duplicate INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (layer_id) REFERENCES layers(id)
    );

    CREATE TABLE IF NOT EXISTS processing_records (
      id TEXT PRIMARY KEY,
      exception_id TEXT NOT NULL,
      action TEXT NOT NULL,
      operator TEXT,
      opinion TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      previous_status TEXT,
      new_status TEXT,
      FOREIGN KEY (exception_id) REFERENCES exceptions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
    CREATE INDEX IF NOT EXISTS idx_exceptions_type ON exceptions(type);
    CREATE INDEX IF NOT EXISTS idx_exceptions_layer ON exceptions(layer_id);
    CREATE INDEX IF NOT EXISTS idx_processing_exception ON processing_records(exception_id);
  `);

  console.log('Database initialized at:', DB_PATH);
}
