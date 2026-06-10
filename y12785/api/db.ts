import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'ms-attribution.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    batch_no TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'imported',
    weighing_precision TEXT NOT NULL DEFAULT '0.1mg',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS spectrum_pages (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    page_number INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    data TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(batch_id, page_number)
  );
  CREATE TABLE IF NOT EXISTS fragment_attributions (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    fragment_ion TEXT NOT NULL,
    parent_ion TEXT NOT NULL,
    match_score REAL NOT NULL,
    confidence TEXT NOT NULL,
    safety_hint TEXT,
    source_material TEXT
  );
  CREATE TABLE IF NOT EXISTS concentration_results (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL UNIQUE REFERENCES batches(id),
    sample_weight REAL NOT NULL,
    weight_unit TEXT NOT NULL DEFAULT 'mg',
    dilution_factor REAL NOT NULL DEFAULT 1,
    concentration REAL NOT NULL,
    concentration_unit TEXT NOT NULL DEFAULT 'μg/mL',
    significant_digits INTEGER NOT NULL,
    uncertainty REAL NOT NULL,
    weighing_precision TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS temperature_records (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    timestamp TEXT NOT NULL,
    temperature REAL NOT NULL,
    is_control_point INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS review_records (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    reviewer TEXT NOT NULL,
    decision TEXT NOT NULL,
    comment TEXT,
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    target_item_id TEXT
  );
  CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    action TEXT NOT NULL,
    operator TEXT NOT NULL,
    detail TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

export function logOperation(batchId: string, action: string, operator: string, detail?: string): void {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO operation_logs (id, batch_id, action, operator, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(id, batchId, action, operator, detail ?? null)
}

export default db
