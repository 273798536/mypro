import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wharf_collision.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      warehouse_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_points INTEGER NOT NULL DEFAULT 0,
      anomaly_count INTEGER NOT NULL DEFAULT 0,
      detected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS points (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      object_name TEXT NOT NULL,
      source TEXT NOT NULL,
      raw_x TEXT,
      raw_y TEXT,
      raw_z TEXT,
      parsed_x REAL,
      parsed_y REAL,
      parsed_z REAL,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS collisions (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      type TEXT NOT NULL,
      object_a TEXT,
      object_b TEXT,
      point_id TEXT,
      status TEXT NOT NULL DEFAULT 'needs_review',
      description TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      rejudged_by TEXT,
      rejudged_reason TEXT,
      rejudged_at TEXT,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (point_id) REFERENCES points(id)
    );

    CREATE TABLE IF NOT EXISTS history_records (
      id TEXT PRIMARY KEY,
      collision_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      operator TEXT NOT NULL,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (collision_id) REFERENCES collisions(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS saved_views (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      anomaly_types TEXT NOT NULL,
      status_filter TEXT NOT NULL,
      sort_by TEXT NOT NULL,
      sort_order TEXT NOT NULL,
      camera_angle TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_points_batch_id ON points(batch_id);
    CREATE INDEX IF NOT EXISTS idx_collisions_batch_id ON collisions(batch_id);
    CREATE INDEX IF NOT EXISTS idx_collisions_status ON collisions(status);
    CREATE INDEX IF NOT EXISTS idx_history_batch_id ON history_records(batch_id);
    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history_records(created_at DESC);
  `);
}
