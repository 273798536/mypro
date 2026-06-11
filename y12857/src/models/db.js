const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/ais_drift.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'imported',
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      cleaned_at TEXT,
      reviewed_at TEXT,
      exported_at TEXT,
      total_ais_points INTEGER DEFAULT 0,
      total_water_records INTEGER DEFAULT 0,
      anomaly_count INTEGER DEFAULT 0,
      water_gap_count INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS ais_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      mmsi TEXT NOT NULL,
      ship_name TEXT,
      timestamp TEXT NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL,
      speed REAL,
      course REAL,
      is_drift_anomaly INTEGER DEFAULT 0,
      drift_reason TEXT,
      drift_distance REAL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_quality (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      station_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      lon REAL,
      lat REAL,
      ph REAL,
      dissolved_oxygen REAL,
      turbidity REAL,
      is_missing INTEGER DEFAULT 0,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS drift_anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      ais_point_id INTEGER NOT NULL,
      mmsi TEXT NOT NULL,
      anomaly_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      risk_level TEXT DEFAULT 'low',
      risk_reason TEXT,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (ais_point_id) REFERENCES ais_points(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS risk_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      anomaly_id INTEGER NOT NULL,
      report_no TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (anomaly_id) REFERENCES drift_anomalies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_opinions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      anomaly_id INTEGER,
      reviewer TEXT,
      opinion TEXT NOT NULL,
      action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (anomaly_id) REFERENCES drift_anomalies(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ais_batch ON ais_points(batch_id);
    CREATE INDEX IF NOT EXISTS idx_ais_mmsi ON ais_points(mmsi);
    CREATE INDEX IF NOT EXISTS idx_water_batch ON water_quality(batch_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_batch ON drift_anomalies(batch_id);
    CREATE INDEX IF NOT EXISTS idx_risk_batch ON risk_reports(batch_id);
    CREATE INDEX IF NOT EXISTS idx_review_batch ON review_opinions(batch_id);
  `);
};

initTables();

module.exports = db;
