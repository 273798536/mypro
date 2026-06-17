import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ramps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bridge_name TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  current_status TEXT NOT NULL,
  is_overriding INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  ramp_id TEXT NOT NULL REFERENCES ramps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT,
  photo_url TEXT,
  is_overriding INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_ramp ON items(ramp_id);

CREATE TABLE IF NOT EXISTS change_logs (
  id TEXT PRIMARY KEY,
  ramp_id TEXT NOT NULL REFERENCES ramps(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  affected_summary TEXT,
  operator TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_ramp ON change_logs(ramp_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON change_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_source ON change_logs(source);

CREATE TABLE IF NOT EXISTS feedback_notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  is_grayscale INTEGER NOT NULL DEFAULT 0,
  affects_ramps TEXT,
  created_at TEXT NOT NULL
);
`;

export function initDb(): void {
  db.exec(SCHEMA);
}

export function resetDb(): void {
  db.exec(`
    DROP TABLE IF EXISTS feedback_notes;
    DROP TABLE IF EXISTS change_logs;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS ramps;
  `);
  db.exec(SCHEMA);
}

export function isEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) AS c FROM ramps').get() as { c: number };
  return row.c === 0;
}

export default db;
