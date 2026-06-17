const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'inspection.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inspection_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'imported',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      current_version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS buoy_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      buoy_id TEXT NOT NULL,
      location TEXT,
      water_depth REAL,
      flow_velocity REAL,
      wave_height REAL,
      water_temperature REAL,
      wind_speed REAL,
      wind_direction TEXT,
      record_time TEXT,
      is_valid INTEGER NOT NULL DEFAULT 1,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      import_note TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tide_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      tide_date TEXT NOT NULL,
      high_tide_time TEXT,
      high_tide_level REAL,
      low_tide_time TEXT,
      low_tide_level REAL,
      port_name TEXT,
      old_remark TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weather_forecasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      forecast_date TEXT NOT NULL,
      weather_condition TEXT,
      wind_force TEXT,
      wind_direction TEXT,
      visibility REAL,
      fog_warning INTEGER DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS restricted_zone_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      vessel_name TEXT,
      vessel_mmsi TEXT,
      violation_time TEXT,
      zone_name TEXT,
      zone_type TEXT,
      duration_minutes INTEGER,
      intrusion_distance REAL,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inspection_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      photo_no TEXT,
      photo_type TEXT,
      location TEXT,
      taken_time TEXT,
      file_path TEXT,
      file_name TEXT,
      is_missing INTEGER NOT NULL DEFAULT 0,
      missing_reason TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS aquaculture_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      log_date TEXT,
      log_content TEXT,
      is_supplementary INTEGER NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewer TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_factors TEXT,
      risk_details TEXT,
      assessment_basis TEXT,
      assessment_note TEXT,
      assessor TEXT,
      assessed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version_from INTEGER NOT NULL,
      version_to INTEGER NOT NULL,
      material_type TEXT NOT NULL,
      material_id INTEGER,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      reviewer TEXT,
      review_comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      report_no TEXT,
      report_content TEXT,
      duplicate_materials TEXT,
      generated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      generated_by TEXT,
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS duplicate_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      material_type TEXT NOT NULL,
      material_key TEXT NOT NULL,
      duplicate_count INTEGER NOT NULL DEFAULT 1,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      status TEXT NOT NULL DEFAULT 'pending',
      resolution TEXT,
      FOREIGN KEY (batch_id) REFERENCES inspection_batches(id) ON DELETE CASCADE
    );
  `);
}

initDatabase();

function resetDatabase() {
  db.exec(`
    DROP TABLE IF EXISTS duplicate_tracking;
    DROP TABLE IF EXISTS reports;
    DROP TABLE IF EXISTS review_records;
    DROP TABLE IF EXISTS risk_assessments;
    DROP TABLE IF EXISTS aquaculture_logs;
    DROP TABLE IF EXISTS inspection_photos;
    DROP TABLE IF EXISTS restricted_zone_violations;
    DROP TABLE IF EXISTS weather_forecasts;
    DROP TABLE IF EXISTS tide_tables;
    DROP TABLE IF EXISTS buoy_data;
    DROP TABLE IF EXISTS inspection_batches;
  `);
  initDatabase();
}

module.exports = db;
module.exports.resetDatabase = resetDatabase;
