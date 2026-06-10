import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '..', '..', 'data')
const DB_PATH = path.join(DB_DIR, 'reaction_heat.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase(): void {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS weighing_records (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      operator TEXT,
      filename TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weighing_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT NOT NULL REFERENCES weighing_records(id),
      row_index INTEGER NOT NULL,
      reagent_name TEXT NOT NULL,
      batch_no TEXT,
      concentration REAL,
      weight REAL,
      purity REAL
    );

    CREATE TABLE IF NOT EXISTS peak_analysis (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL REFERENCES weighing_records(id),
      peaks_json TEXT,
      overlaps_json TEXT,
      warnings_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS balance_calc (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL REFERENCES weighing_records(id),
      equation TEXT,
      enthalpy_change REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS material_trace (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calc_id TEXT NOT NULL REFERENCES balance_calc(id),
      row_id INTEGER REFERENCES weighing_rows(id),
      reagent_name TEXT NOT NULL,
      expected_conc REAL,
      actual_conc REAL,
      delta_desc TEXT
    );

    CREATE TABLE IF NOT EXISTS trace_logs (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL REFERENCES weighing_records(id),
      severity TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      actionable TEXT,
      resolved INTEGER DEFAULT 0,
      resolution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL REFERENCES weighing_records(id),
      conclusion_level TEXT NOT NULL,
      preview_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      batch_no TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      standard_conc REAL,
      standard_purity REAL,
      supplier TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_rows_record ON weighing_rows(record_id);
    CREATE INDEX IF NOT EXISTS idx_trace_record ON trace_logs(record_id);
    CREATE INDEX IF NOT EXISTS idx_trace_severity ON trace_logs(severity);
    CREATE INDEX IF NOT EXISTS idx_records_status ON weighing_records(status);
  `

  db.exec(createTablesSQL)
  console.log('[DB] Database initialized successfully')
}

export function isDatabaseEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) as count FROM weighing_records').get() as { count: number }
  return row.count === 0
}
