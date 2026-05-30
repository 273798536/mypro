import sqlite3, { Database } from 'sqlite3';

let db: Database | null = null;

export async function getDatabase(testMode: boolean = false): Promise<Database> {
  if (db) return db;
  
  const dbPath = testMode ? ':memory:' : './bridge_monitoring.db';
  
  db = new sqlite3.Database(dbPath);
  
  await initializeDatabase(db);
  
  return db;
}

function initializeDatabase(database: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run(`
        CREATE TABLE IF NOT EXISTS sensors (
          id TEXT PRIMARY KEY,
          sensor_code TEXT UNIQUE NOT NULL,
          cable_id TEXT,
          installation_date TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')),
          location TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS temperature_records (
          id TEXT PRIMARY KEY,
          sensor_id TEXT NOT NULL,
          record_time TEXT NOT NULL,
          temperature REAL,
          frequency REAL,
          wind_speed REAL,
          is_valid INTEGER NOT NULL DEFAULT 1,
          import_batch_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (sensor_id) REFERENCES sensors(id),
          FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS cable_archives (
          id TEXT PRIMARY KEY,
          cable_code TEXT UNIQUE NOT NULL,
          cable_name TEXT NOT NULL,
          design_frequency REAL NOT NULL,
          material TEXT NOT NULL,
          length REAL NOT NULL,
          tension REAL NOT NULL,
          diameter REAL NOT NULL,
          temperature_coefficient REAL NOT NULL,
          reference_temperature REAL NOT NULL,
          installation_date TEXT NOT NULL,
          import_batch_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS monitoring_details (
          id TEXT PRIMARY KEY,
          temperature_record_id TEXT NOT NULL,
          sensor_id TEXT NOT NULL,
          cable_id TEXT,
          record_time TEXT NOT NULL,
          raw_frequency REAL,
          raw_temperature REAL,
          wind_speed REAL,
          corrected_frequency REAL,
          temperature_correction REAL,
          wind_effect_estimate REAL,
          deviation_from_design REAL,
          anomaly_score REAL NOT NULL,
          is_anomaly INTEGER NOT NULL,
          anomaly_cause TEXT,
          trend_comparison TEXT,
          status TEXT NOT NULL CHECK (status IN ('pending', 'normal', 'warning', 'critical', 'resolved')),
          import_phase INTEGER NOT NULL,
          affected_by_cable_archive INTEGER NOT NULL DEFAULT 0,
          detection_version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (temperature_record_id) REFERENCES temperature_records(id),
          FOREIGN KEY (sensor_id) REFERENCES sensors(id),
          FOREIGN KEY (cable_id) REFERENCES cable_archives(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS anomaly_detection_results (
          id TEXT PRIMARY KEY,
          detail_id TEXT NOT NULL,
          detection_version INTEGER NOT NULL,
          is_anomaly INTEGER NOT NULL,
          anomaly_score REAL NOT NULL,
          anomaly_type TEXT NOT NULL,
          cause_explanation TEXT NOT NULL,
          trend_analysis TEXT NOT NULL,
          confidence REAL NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (detail_id) REFERENCES monitoring_details(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS import_batches (
          id TEXT PRIMARY KEY,
          batch_type TEXT NOT NULL,
          phase INTEGER NOT NULL,
          record_count INTEGER NOT NULL,
          imported_at TEXT NOT NULL,
          imported_by TEXT NOT NULL
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS change_logs (
          id TEXT PRIMARY KEY,
          detail_id TEXT NOT NULL,
          field_name TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          change_reason TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          FOREIGN KEY (detail_id) REFERENCES monitoring_details(id)
        )
      `);

      database.run(`
        CREATE INDEX IF NOT EXISTS idx_records_sensor_time ON temperature_records(sensor_id, record_time)
      `);
      
      database.run(`
        CREATE INDEX IF NOT EXISTS idx_details_sensor_time ON monitoring_details(sensor_id, record_time)
      `);
      
      database.run(
        `CREATE INDEX IF NOT EXISTS idx_details_anomaly ON monitoring_details(is_anomaly, status)`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    return new Promise((resolve, reject) => {
      db!.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    });
  }
}

export async function resetDatabase(): Promise<void> {
  if (db) {
    await closeDatabase();
  }
  const fs = require('fs');
  if (fs.existsSync('./bridge_monitoring.db')) {
    fs.unlinkSync('./bridge_monitoring.db');
  }
}
