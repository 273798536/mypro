import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'phenotype.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initTables(db)
  return db
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS experiment_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      conclusion_status TEXT NOT NULL DEFAULT 'pending' CHECK(conclusion_status IN ('normal','abnormal','pending')),
      conclusion TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES experiment_groups(id),
      plant_code TEXT NOT NULL,
      species TEXT,
      UNIQUE(group_id, plant_code)
    );

    CREATE TABLE IF NOT EXISTS cultivation_records (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES experiment_groups(id),
      plant_id TEXT NOT NULL REFERENCES plants(id),
      batch_no TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      light_intensity REAL,
      nutrient_solution TEXT,
      is_supplementary INTEGER NOT NULL DEFAULT 0,
      supplementary_to TEXT REFERENCES cultivation_records(id),
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS growth_measurements (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL REFERENCES plants(id),
      group_id TEXT NOT NULL REFERENCES experiment_groups(id),
      record_id TEXT NOT NULL REFERENCES cultivation_records(id),
      batch_no TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      height REAL,
      leaf_area REAL,
      stem_diameter REAL,
      annotation TEXT NOT NULL DEFAULT 'normal' CHECK(annotation IN ('normal','abnormal','pending')),
      measured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_log (
      id TEXT PRIMARY KEY,
      source_file TEXT NOT NULL,
      import_type TEXT NOT NULL CHECK(import_type IN ('json','csv')),
      total_rows INTEGER NOT NULL,
      inserted_rows INTEGER NOT NULL,
      skipped_rows INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_plants_group ON plants(group_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_plant ON growth_measurements(plant_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_group ON growth_measurements(group_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_record ON growth_measurements(record_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_batch ON growth_measurements(batch_no);
    CREATE INDEX IF NOT EXISTS idx_records_batch ON cultivation_records(batch_no);
    CREATE INDEX IF NOT EXISTS idx_records_group ON cultivation_records(group_id);
    CREATE INDEX IF NOT EXISTS idx_records_supplementary ON cultivation_records(is_supplementary);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_duplicate_check ON cultivation_records(plant_id, measured_at, batch_no);
  `)
}
