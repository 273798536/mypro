const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'laojie.db');

let db = null;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initSchema() {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS gis_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      address TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS opinion_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gis_point_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      supersedes_id INTEGER,
      source_description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (gis_point_id) REFERENCES gis_points(id),
      FOREIGN KEY (supersedes_id) REFERENCES opinion_entries(id)
    );

    CREATE TABLE IF NOT EXISTS processing_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opinion_entry_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','processed','needs_evidence')),
      markdown_report TEXT DEFAULT '',
      changed_judgments TEXT DEFAULT '',
      processed_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (opinion_entry_id) REFERENCES opinion_entries(id)
    );

    CREATE TABLE IF NOT EXISTS merge_evidences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merged_gis_point_id INTEGER NOT NULL,
      source_gis_point_ids TEXT NOT NULL,
      evidence_markdown TEXT NOT NULL,
      merge_reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (merged_gis_point_id) REFERENCES gis_points(id)
    );

    CREATE TABLE IF NOT EXISTS capacity_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gis_point_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL DEFAULT 'capacity_overflow',
      original_data_ref TEXT NOT NULL,
      detail TEXT DEFAULT '',
      resolved INTEGER DEFAULT 0,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (gis_point_id) REFERENCES gis_points(id)
    );

    CREATE INDEX IF NOT EXISTS idx_opinion_gis ON opinion_entries(gis_point_id);
    CREATE INDEX IF NOT EXISTS idx_processing_opinion ON processing_records(opinion_entry_id);
    CREATE INDEX IF NOT EXISTS idx_processing_status ON processing_records(status);
    CREATE INDEX IF NOT EXISTS idx_alert_gis ON capacity_alerts(gis_point_id);
    CREATE INDEX IF NOT EXISTS idx_alert_resolved ON capacity_alerts(resolved);
  `);

  return d;
}

module.exports = { getDb, initSchema };
