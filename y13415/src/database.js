const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/cut_vertex.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      package_no TEXT NOT NULL,
      graph_data TEXT NOT NULL,
      expected_cut_points TEXT,
      actual_cut_points TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      unit TEXT,
      threshold REAL,
      parameter_version TEXT NOT NULL DEFAULT 'v1.0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewer TEXT,
      review_comment TEXT,
      is_dirty INTEGER DEFAULT 0,
      dirty_reason TEXT,
      processing_suggestion TEXT
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      operator TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parameter_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT NOT NULL,
      version TEXT NOT NULL,
      param_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT NOT NULL,
      old_unit TEXT,
      new_unit TEXT,
      conversion_factor REAL,
      threshold_old REAL,
      threshold_new REAL,
      operator TEXT NOT NULL,
      change_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT NOT NULL,
      exception_type TEXT NOT NULL,
      detail TEXT NOT NULL,
      original_value TEXT,
      suggested_value TEXT,
      suggestion TEXT,
      severity TEXT NOT NULL DEFAULT 'warning',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      needs_human_judgment INTEGER DEFAULT 1,
      human_judgment_result TEXT,
      judgment_note TEXT,
      operator TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_package ON records(package_no);
    CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
    CREATE INDEX IF NOT EXISTS idx_status_history_record ON status_history(record_id);
    CREATE INDEX IF NOT EXISTS idx_param_versions_record ON parameter_versions(record_id);
    CREATE INDEX IF NOT EXISTS idx_exceptions_record ON exceptions(record_id);
    CREATE INDEX IF NOT EXISTS idx_review_actions_record ON review_actions(record_id);
  `);
}

initTables();

module.exports = db;
