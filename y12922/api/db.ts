import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'review.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode=WAL');
    db.pragma('foreign_keys=ON');
  }
  return db;
}

export function initSchema(): void {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS batch (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      source_file_name TEXT,
      status TEXT NOT NULL DEFAULT 'IMPORTED',
      sample_count INTEGER NOT NULL DEFAULT 0,
      agreement_rate REAL NOT NULL DEFAULT 0,
      kappa REAL NOT NULL DEFAULT 0,
      anomaly_count INTEGER NOT NULL DEFAULT 0,
      conclusion_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sample (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      sample_key TEXT NOT NULL,
      content TEXT NOT NULL,
      split_tag TEXT NOT NULL CHECK (split_tag IN ('train','eval')),
      UNIQUE (batch_id, sample_key)
    );

    CREATE TABLE IF NOT EXISTS annotation (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL REFERENCES sample(id) ON DELETE CASCADE,
      annotator TEXT NOT NULL,
      label TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_annotation_sample ON annotation(sample_id);

    CREATE TABLE IF NOT EXISTS conclusion (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL UNIQUE REFERENCES batch(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      per_annotator_json TEXT NOT NULL,
      computed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anomaly (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      sample_id TEXT NOT NULL REFERENCES sample(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('DISAGREEMENT','DATASET_BIAS','OUTLIER')),
      severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      trace_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_anomaly_batch ON anomaly(batch_id);

    CREATE TABLE IF NOT EXISTS opinion (
      id TEXT PRIMARY KEY,
      anomaly_id TEXT NOT NULL UNIQUE REFERENCES anomaly(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('RELABEL','REMOVE','KEEP','RESPLIT')),
      text TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      html TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_report_batch ON report(batch_id);

    CREATE TABLE IF NOT EXISTS comparison (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      against_batch_id TEXT NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comparison_batch ON comparison(batch_id);
  `);
}
