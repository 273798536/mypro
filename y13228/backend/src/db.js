const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'theater_encore.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_no TEXT,
    track_name TEXT NOT NULL,
    track_aliases TEXT,
    file_name TEXT,
    source TEXT,
    source_type TEXT DEFAULT 'manual',
    program_order INTEGER,
    is_encore INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    remark TEXT,
    auth_remark TEXT,
    anomaly_type TEXT,
    anomaly_detail TEXT,
    operator TEXT DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS track_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    operator TEXT DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS import_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    field_mapping TEXT,
    file_name TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    operator TEXT DEFAULT 'system',
    remark TEXT
  );

  CREATE TABLE IF NOT EXISTS alias_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias_name TEXT NOT NULL,
    track_ids TEXT NOT NULL,
    conflict_type TEXT DEFAULT 'duplicate_alias',
    resolved INTEGER DEFAULT 0,
    resolved_remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS anomaly_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER,
    alert_type TEXT NOT NULL,
    alert_level TEXT DEFAULT 'warning',
    alert_detail TEXT NOT NULL,
    resolved INTEGER DEFAULT 0,
    resolved_by TEXT,
    resolved_remark TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tracks_name ON tracks(track_name);
  CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
  CREATE INDEX IF NOT EXISTS idx_tracks_encore ON tracks(is_encore);
  CREATE INDEX IF NOT EXISTS idx_history_track ON track_history(track_id);
  CREATE INDEX IF NOT EXISTS idx_anomaly_track ON anomaly_alerts(track_id);
  CREATE INDEX IF NOT EXISTS idx_anomaly_resolved ON anomaly_alerts(resolved);
`);

module.exports = db;
