const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "bayesian_prior.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate();
  }
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS material_batches (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      batch_order INTEGER NOT NULL DEFAULT 0,
      source_label TEXT NOT NULL,
      material_type TEXT NOT NULL DEFAULT 'supplement',
      raw_data TEXT NOT NULL DEFAULT '{}',
      unit_info TEXT NOT NULL DEFAULT '{}',
      unit_missing INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS judgments (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      conclusion TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0,
      unit_status TEXT NOT NULL DEFAULT 'ok',
      status TEXT NOT NULL DEFAULT 'active',
      source_batch_id TEXT,
      prior_type TEXT NOT NULL DEFAULT 'non_informative',
      prior_value REAL NOT NULL DEFAULT 0,
      posterior_value REAL NOT NULL DEFAULT 0,
      threshold_used REAL NOT NULL DEFAULT 0.95,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_by TEXT,
      confirmed_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (source_batch_id) REFERENCES material_batches(id)
    );

    CREATE TABLE IF NOT EXISTS judgment_history (
      id TEXT PRIMARY KEY,
      judgment_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      change_type TEXT NOT NULL,
      old_conclusion TEXT NOT NULL DEFAULT '',
      new_conclusion TEXT NOT NULL DEFAULT '',
      old_confidence REAL,
      new_confidence REAL,
      old_posterior REAL,
      new_posterior REAL,
      reason TEXT NOT NULL DEFAULT '',
      source_batch_id TEXT,
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      operator TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (judgment_id) REFERENCES judgments(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (source_batch_id) REFERENCES material_batches(id)
    );

    CREATE TABLE IF NOT EXISTS jump_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      judgment_id TEXT NOT NULL,
      previous_posterior REAL NOT NULL,
      current_posterior REAL NOT NULL,
      delta REAL NOT NULL,
      delta_pct REAL NOT NULL,
      trigger_type TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (judgment_id) REFERENCES judgments(id)
    );
  `);
}

module.exports = { getDb };
