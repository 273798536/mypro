import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'strain_activity.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS samples (
      id TEXT PRIMARY KEY,
      reagent_batch TEXT NOT NULL,
      sample_no TEXT NOT NULL,
      strain_name TEXT NOT NULL,
      original_row INTEGER NOT NULL,
      source_file TEXT NOT NULL,
      source_note TEXT,
      sequencing_result TEXT,
      activity_level TEXT CHECK(activity_level IN ('high', 'medium', 'low', 'inactive')),
      conclusion TEXT,
      reviewer TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending', 'reviewed', 'conflict')),
      import_batch TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(reagent_batch, sample_no)
    );

    CREATE INDEX IF NOT EXISTS idx_samples_reagent_batch ON samples(reagent_batch);
    CREATE INDEX IF NOT EXISTS idx_samples_sample_no ON samples(sample_no);
    CREATE INDEX IF NOT EXISTS idx_samples_import_batch ON samples(import_batch);

    CREATE TABLE IF NOT EXISTS microscope_images (
      id TEXT PRIMARY KEY,
      sample_id TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      source_note TEXT,
      original_row INTEGER,
      import_batch TEXT,
      captured_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_images_sample_id ON microscope_images(sample_id);
    CREATE INDEX IF NOT EXISTS idx_images_file_name ON microscope_images(file_name);

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      label TEXT NOT NULL,
      note TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES microscope_images(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reagent_batch TEXT NOT NULL,
      title TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_reagent_batch ON reports(reagent_batch);

    CREATE TABLE IF NOT EXISTS import_records (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      import_type TEXT NOT NULL CHECK(import_type IN ('samples', 'images')),
      import_batch TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      inserted_count INTEGER NOT NULL,
      updated_count INTEGER NOT NULL,
      conflict_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_imports_batch ON import_records(import_batch);
  `);
}
