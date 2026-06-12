const Database = require('../lib/db');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'classroom.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function init() {
  const db = new Database(dbPath);
  await db.init();

  db.exec(`
    CREATE TABLE IF NOT EXISTS no_go_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      zone_type TEXT NOT NULL,
      tide_sensitive INTEGER DEFAULT 0,
      tide_threshold REAL,
      tide_rule TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS no_go_zone_coords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL,
      "order" INTEGER NOT NULL,
      FOREIGN KEY (zone_id) REFERENCES no_go_zones(id)
    );

    CREATE TABLE IF NOT EXISTS vessels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mmsi TEXT UNIQUE,
      vessel_type TEXT,
      length REAL,
      width REAL,
      draft REAL
    );

    CREATE TABLE IF NOT EXISTS vessel_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_id INTEGER NOT NULL,
      track_time DATETIME NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL,
      speed REAL,
      heading REAL,
      depth REAL,
      source_file TEXT,
      FOREIGN KEY (vessel_id) REFERENCES vessels(id)
    );

    CREATE TABLE IF NOT EXISTS tide_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL,
      reference_level REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tide_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      pred_time DATETIME NOT NULL,
      height REAL NOT NULL,
      calc_version TEXT DEFAULT 'v1',
      FOREIGN KEY (station_id) REFERENCES tide_stations(id)
    );

    CREATE TABLE IF NOT EXISTS wave_forecasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      forecast_time DATETIME NOT NULL,
      valid_time DATETIME NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL,
      wave_height REAL,
      wave_period REAL,
      wind_speed REAL,
      received_at DATETIME,
      is_delayed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS aquaculture_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date DATE NOT NULL,
      farm_name TEXT NOT NULL,
      cage_count INTEGER,
      feeding_amount REAL,
      temperature REAL,
      mortality INTEGER DEFAULT 0,
      source_file TEXT,
      is_missing INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS seabed_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_name TEXT NOT NULL,
      start_lon REAL NOT NULL,
      start_lat REAL NOT NULL,
      end_lon REAL NOT NULL,
      end_lat REAL NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS seabed_profile_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      distance REAL NOT NULL,
      depth REAL NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES seabed_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_name TEXT NOT NULL,
      run_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      tide_version TEXT DEFAULT 'v1',
      status TEXT DEFAULT 'completed',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      vessel_id INTEGER NOT NULL,
      track_point_id INTEGER NOT NULL,
      zone_id INTEGER,
      is_violation INTEGER DEFAULT 0,
      violation_type TEXT,
      depth_at_point REAL,
      tide_correction REAL,
      wave_forecast_available INTEGER DEFAULT 0,
      aquaculture_available INTEGER DEFAULT 1,
      evidence_sources TEXT,
      confidence REAL DEFAULT 0.0,
      FOREIGN KEY (run_id) REFERENCES analysis_runs(id),
      FOREIGN KEY (vessel_id) REFERENCES vessels(id),
      FOREIGN KEY (track_point_id) REFERENCES vessel_tracks(id),
      FOREIGN KEY (zone_id) REFERENCES no_go_zones(id)
    );

    CREATE TABLE IF NOT EXISTS data_gaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      gap_type TEXT NOT NULL,
      description TEXT NOT NULL,
      related_date DATE,
      related_entity TEXT,
      impact_level TEXT DEFAULT 'medium',
      FOREIGN KEY (run_id) REFERENCES analysis_runs(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      report_type TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      content TEXT,
      evidence_summary TEXT,
      FOREIGN KEY (run_id) REFERENCES analysis_runs(id)
    );
  `);

  console.log('数据库初始化完成:', dbPath);
  db.close();
}

init().catch(e => {
  console.error('初始化失败:', e.message);
  process.exit(1);
});
