CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL,
  original_row_number INTEGER NOT NULL,
  image_file_name TEXT,
  source_remark TEXT,
  cell_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending_qc',
  qc_conclusion TEXT,
  review_note TEXT,
  import_batch_id TEXT NOT NULL,
  is_duplicate INTEGER NOT NULL DEFAULT 0,
  duplicate_group_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_samples_barcode ON samples(barcode);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_duplicate_group ON samples(duplicate_group_id);
CREATE INDEX IF NOT EXISTS idx_samples_batch ON samples(import_batch_id);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  sample_id TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  label TEXT NOT NULL DEFAULT 'cell',
  created_at TEXT NOT NULL,
  FOREIGN KEY (sample_id) REFERENCES samples(id)
);

CREATE INDEX IF NOT EXISTS idx_annotations_sample ON annotations(sample_id);

CREATE TABLE IF NOT EXISTS qc_reports (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  total_samples INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  review_needed_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL
);
