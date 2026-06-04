import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'loading_sketch.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS loading_records (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      platform_no TEXT NOT NULL,
      vehicle_no TEXT NOT NULL,
      sketch_image TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      anomaly_type TEXT,
      source TEXT NOT NULL,
      import_time INTEGER NOT NULL,
      latest_score INTEGER,
      latest_score_note TEXT,
      scorer TEXT,
      score_time INTEGER,
      is_supplement INTEGER NOT NULL DEFAULT 0,
      supplement_from TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_records_batch ON loading_records(batch_no);
    CREATE INDEX IF NOT EXISTS idx_records_status ON loading_records(status);
    CREATE INDEX IF NOT EXISTS idx_records_platform ON loading_records(platform_no);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_unique ON loading_records(batch_no, platform_no, vehicle_no);

    CREATE TABLE IF NOT EXISTS score_history (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      score_note TEXT,
      reason TEXT NOT NULL,
      scorer TEXT NOT NULL,
      score_time INTEGER NOT NULL,
      previous_score INTEGER,
      FOREIGN KEY (record_id) REFERENCES loading_records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_record ON score_history(record_id);

    CREATE TABLE IF NOT EXISTS processing_notes (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      create_time INTEGER NOT NULL,
      FOREIGN KEY (record_id) REFERENCES loading_records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notes_record ON processing_notes(record_id);
  `);
}
