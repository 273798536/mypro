import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'workbench.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      device_name TEXT NOT NULL,
      thumbnail TEXT,
      image_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      risk_level TEXT NOT NULL DEFAULT 'low',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_operator TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processing_records (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      section_data TEXT,
      coordinates TEXT,
      dimensions TEXT,
      conversions TEXT,
      risk_notes TEXT,
      conclusion TEXT,
      operator TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
    );

    CREATE TABLE IF NOT EXISTS history_records (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      processing_record_id TEXT NOT NULL,
      operator TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      changes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id),
      FOREIGN KEY (processing_record_id) REFERENCES processing_records(id),
      UNIQUE(snapshot_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_status ON snapshots(status);
    CREATE INDEX IF NOT EXISTS idx_snapshots_risk ON snapshots(risk_level);
    CREATE INDEX IF NOT EXISTS idx_records_snapshot ON processing_records(snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_history_snapshot ON history_records(snapshot_id);
  `);
}
