import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, "..", "data", "pump.db")

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  migrate(db)
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculation_record (
      id TEXT PRIMARY KEY,
      rated_flow TEXT NOT NULL,
      rated_flow_unit TEXT NOT NULL DEFAULT 'm3/h',
      rated_head TEXT NOT NULL,
      rated_head_unit TEXT NOT NULL DEFAULT 'm',
      rated_power TEXT NOT NULL,
      rated_power_unit TEXT NOT NULL DEFAULT 'kW',
      rated_speed REAL NOT NULL,
      target_speed REAL NOT NULL,
      target_flow TEXT,
      target_head TEXT,
      target_power TEXT,
      flow_ratio REAL,
      head_ratio REAL,
      power_ratio REAL,
      efficiency_estimate REAL,
      source TEXT NOT NULL DEFAULT 'manual',
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS validation_log (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      affected_fields TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (record_id) REFERENCES calculation_record(id)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT 'system',
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (record_id) REFERENCES calculation_record(id)
    );

    CREATE TABLE IF NOT EXISTS scheme_comparison (
      id TEXT PRIMARY KEY,
      record_ids TEXT NOT NULL,
      comparison_name TEXT NOT NULL,
      result_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_record_status ON calculation_record(status);
    CREATE INDEX IF NOT EXISTS idx_record_created ON calculation_record(created_at);
    CREATE INDEX IF NOT EXISTS idx_validation_record ON validation_log(record_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_record ON status_history(record_id);
  `)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
