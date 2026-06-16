import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'complaints.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  original_text TEXT NOT NULL,
  location_raw TEXT NOT NULL,
  location_normalized TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','merged','confirmed')),
  source TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  merge_group_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id),
  url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS merge_records (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL UNIQUE,
  merged_location TEXT NOT NULL,
  merge_basis TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS merge_record_complaints (
  merge_record_id TEXT NOT NULL REFERENCES merge_records(id),
  complaint_id TEXT NOT NULL REFERENCES complaints(id),
  original_location TEXT NOT NULL,
  PRIMARY KEY (merge_record_id, complaint_id)
);

CREATE TABLE IF NOT EXISTS note_histories (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id),
  field TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS confirmation_logs (
  id TEXT PRIMARY KEY,
  merge_group_id TEXT NOT NULL REFERENCES merge_records(group_id),
  action TEXT NOT NULL CHECK(action IN ('confirm','unconfirm','edit_note','merge','unmerge')),
  before_snapshot TEXT NOT NULL,
  after_snapshot TEXT NOT NULL,
  operator TEXT NOT NULL,
  operated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints(location_normalized);
CREATE INDEX IF NOT EXISTS idx_complaints_merge_group ON complaints(merge_group_id);
CREATE INDEX IF NOT EXISTS idx_note_histories_complaint ON note_histories(complaint_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_logs_group ON confirmation_logs(merge_group_id);
`)

export default db
