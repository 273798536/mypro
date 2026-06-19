import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '..', 'data', 'scheduling.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS version_snapshots (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS evaluation_results (
    id TEXT PRIMARY KEY,
    sample_id TEXT NOT NULL,
    version TEXT NOT NULL,
    evaluated_at TEXT NOT NULL,
    has_human_correction INTEGER DEFAULT 0,
    has_threshold_drift INTEGER DEFAULT 0,
    raw_api_response TEXT,
    source TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS metric_values (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    threshold REAL NOT NULL,
    drift_ratio REAL,
    is_drifted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS human_corrections (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    original_value REAL NOT NULL,
    corrected_value REAL NOT NULL,
    corrected_by TEXT NOT NULL,
    corrected_at TEXT NOT NULL,
    reason TEXT,
    source TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS threshold_configs (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL,
    threshold REAL NOT NULL,
    version TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_eval_sample ON evaluation_results(sample_id);
  CREATE INDEX IF NOT EXISTS idx_eval_version ON evaluation_results(version);
  CREATE INDEX IF NOT EXISTS idx_metric_eval ON metric_values(evaluation_id);
  CREATE INDEX IF NOT EXISTS idx_correction_eval ON human_corrections(evaluation_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_threshold_unique ON threshold_configs(metric_name, version);
`)

export default db
