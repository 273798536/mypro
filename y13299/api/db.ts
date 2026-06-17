import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'data.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS seat_record (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    location_name TEXT NOT NULL,
    street TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    material_completeness INTEGER NOT NULL DEFAULT 0,
    latest_judgment TEXT,
    latest_judgment_reason TEXT,
    latest_judgment_at TEXT,
    latest_judgment_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS gis_point (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    lng REAL NOT NULL,
    lat REAL NOT NULL,
    source TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    is_abnormal INTEGER NOT NULL DEFAULT 0,
    abnormal_note TEXT,
    FOREIGN KEY (record_id) REFERENCES seat_record(id)
  );

  CREATE TABLE IF NOT EXISTS material_attachment (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (record_id) REFERENCES seat_record(id)
  );

  CREATE TABLE IF NOT EXISTS history_entry (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    operator TEXT NOT NULL,
    operated_at TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT,
    note TEXT,
    evidence TEXT,
    FOREIGN KEY (record_id) REFERENCES seat_record(id)
  );

  CREATE TABLE IF NOT EXISTS exception_item (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    related_record_ids TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    comparison_data TEXT,
    resolved_note TEXT,
    resolved_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_record_status ON seat_record(status);
  CREATE INDEX IF NOT EXISTS idx_record_street ON seat_record(street);
  CREATE INDEX IF NOT EXISTS idx_gis_point_record ON gis_point(record_id);
  CREATE INDEX IF NOT EXISTS idx_attachment_record ON material_attachment(record_id);
  CREATE INDEX IF NOT EXISTS idx_history_record ON history_entry(record_id);
  CREATE INDEX IF NOT EXISTS idx_exception_status ON exception_item(status);
`);

const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM seat_record').get() as { cnt: number }).cnt;
if (existingCount === 0) {
  const { initMockData } = await import('./services/initMockData.js');
  initMockData(db);
}

export default db;
