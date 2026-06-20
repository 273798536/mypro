import db from './db';

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      params_json TEXT NOT NULL,
      engineer TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      description TEXT,
      parent_run_id TEXT,
      FOREIGN KEY (parent_run_id) REFERENCES runs(run_id)
    );

    CREATE TABLE IF NOT EXISTS feature_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      feature_definition TEXT NOT NULL,
      version TEXT NOT NULL,
      offline_metric_json TEXT,
      online_metric_json TEXT,
      metric_mismatch_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL,
      is_temporary INTEGER NOT NULL DEFAULT 0,
      original_snapshot_id TEXT,
      FOREIGN KEY (original_snapshot_id) REFERENCES feature_snapshots(snapshot_id)
    );

    CREATE TABLE IF NOT EXISTS run_snapshot_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      snapshot_id TEXT NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      added_by TEXT NOT NULL,
      remark TEXT,
      UNIQUE(run_id, snapshot_id),
      FOREIGN KEY (run_id) REFERENCES runs(run_id),
      FOREIGN KEY (snapshot_id) REFERENCES feature_snapshots(snapshot_id)
    );

    CREATE TABLE IF NOT EXISTS snapshot_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id TEXT NOT NULL,
      note_content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL,
      changed_judgments_json TEXT,
      FOREIGN KEY (snapshot_id) REFERENCES feature_snapshots(snapshot_id)
    );

    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      ground_truth_label TEXT NOT NULL,
      is_replay INTEGER NOT NULL DEFAULT 0,
      original_run_id TEXT,
      original_model_label TEXT,
      note TEXT,
      FOREIGN KEY (original_run_id) REFERENCES runs(run_id)
    );

    CREATE TABLE IF NOT EXISTS judgments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      sample_id TEXT NOT NULL,
      model_label TEXT NOT NULL,
      confidence REAL NOT NULL,
      final_decision TEXT NOT NULL,
      decision_reason TEXT,
      judged_at TEXT NOT NULL DEFAULT (datetime('now')),
      judged_by TEXT NOT NULL,
      is_modified INTEGER NOT NULL DEFAULT 0,
      feature_snapshot_ids_json TEXT,
      UNIQUE(run_id, sample_id),
      FOREIGN KEY (run_id) REFERENCES runs(run_id),
      FOREIGN KEY (sample_id) REFERENCES samples(sample_id)
    );

    CREATE TABLE IF NOT EXISTS judgment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      sample_id TEXT NOT NULL,
      previous_decision TEXT NOT NULL,
      new_decision TEXT NOT NULL,
      previous_reason TEXT,
      new_reason TEXT,
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      change_note TEXT,
      FOREIGN KEY (run_id) REFERENCES runs(run_id),
      FOREIGN KEY (sample_id) REFERENCES samples(sample_id)
    );

    CREATE TABLE IF NOT EXISTS run_comparisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_run_id TEXT NOT NULL,
      compare_run_id TEXT NOT NULL,
      diff_summary_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (base_run_id) REFERENCES runs(run_id),
      FOREIGN KEY (compare_run_id) REFERENCES runs(run_id)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);
    CREATE INDEX IF NOT EXISTS idx_judgments_run_sample ON judgments(run_id, sample_id);
    CREATE INDEX IF NOT EXISTS idx_judgment_history_run_sample ON judgment_history(run_id, sample_id);
    CREATE INDEX IF NOT EXISTS idx_run_snapshot_links_run ON run_snapshot_links(run_id);
    CREATE INDEX IF NOT EXISTS idx_run_snapshot_links_snapshot ON run_snapshot_links(snapshot_id);
  `);
}
