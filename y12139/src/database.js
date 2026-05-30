const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'analysis.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS analysis_sessions (
          id TEXT PRIMARY KEY,
          cold_storage_id TEXT NOT NULL,
          analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'completed',
          input_hash TEXT,
          metadata TEXT
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS raw_data_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          record_type TEXT NOT NULL,
          record_hash TEXT NOT NULL,
          data TEXT NOT NULL,
          source TEXT,
          received_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS defrost_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          record_id TEXT,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          duration_seconds INTEGER,
          energy_consumption REAL,
          evaporator_temp_before REAL,
          evaporator_temp_after REAL,
          status TEXT,
          fan_status TEXT,
          remarks TEXT,
          is_manual BOOLEAN DEFAULT 0,
          data_quality TEXT,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS temperature_readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          probe_id TEXT,
          reading_time DATETIME NOT NULL,
          temperature REAL,
          remarks TEXT,
          is_offline BOOLEAN DEFAULT 0,
          data_quality TEXT,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS fan_status_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          fan_id TEXT,
          status_time DATETIME NOT NULL,
          status TEXT,
          speed_percent INTEGER,
          delay_seconds INTEGER,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS door_status_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          door_id TEXT,
          event_time DATETIME NOT NULL,
          is_open BOOLEAN,
          duration_seconds INTEGER,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS analysis_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          result_type TEXT NOT NULL,
          result_data TEXT NOT NULL,
          confidence REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS anomaly_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          anomaly_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          start_time DATETIME,
          end_time DATETIME,
          description TEXT,
          attribution TEXT,
          correction_suggestions TEXT,
          related_records TEXT,
          is_resolved BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS heat_load_estimates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          time_slot TEXT NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          total_heat_load_kw REAL,
          door_infiltration REAL,
          defrost_heat REAL,
          product_heat REAL,
          ambient_heat REAL,
          fan_heat REAL,
          lighting_heat REAL,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS energy_consumption (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          period_start DATETIME NOT NULL,
          period_end DATETIME NOT NULL,
          total_energy_kwh REAL,
          defrost_energy_kwh REAL,
          cooling_energy_kwh REAL,
          fan_energy_kwh REAL,
          defrost_energy_ratio REAL,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS version_comparisons (
          id TEXT PRIMARY KEY,
          base_session_id TEXT,
          modified_session_id TEXT,
          comparison_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (base_session_id) REFERENCES analysis_sessions(id),
          FOREIGN KEY (modified_session_id) REFERENCES analysis_sessions(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_storage ON analysis_sessions(cold_storage_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_defrost_time ON defrost_records(start_time)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly_records(anomaly_type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_heatload_slot ON heat_load_estimates(time_slot)`);

      resolve();
    });
  });
}

function getDb() {
  return db;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { initDatabase, getDb, runQuery, getQuery, allQuery };
