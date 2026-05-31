import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/roll-comfort.db');

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS calculation_results (
      id TEXT PRIMARY KEY,
      ship_name TEXT NOT NULL,
      displacement REAL NOT NULL,
      GM REAL NOT NULL,
      roll_radius REAL NOT NULL,
      ship_length REAL NOT NULL,
      ship_width REAL NOT NULL,
      significant_height REAL,
      wave_period REAL,
      wave_direction REAL,
      speed REAL NOT NULL,
      heading_angle REAL NOT NULL,
      longitudinal_pos REAL NOT NULL,
      vertical_pos REAL NOT NULL,
      deck INTEGER NOT NULL,
      roll_frequency REAL,
      roll_amplitude REAL,
      comfort_score REAL,
      comfort_level TEXT,
      applicable_scope TEXT,
      failure_reason TEXT,
      calculation_success INTEGER NOT NULL DEFAULT 0,
      is_duplicate INTEGER NOT NULL DEFAULT 0,
      duplicate_of TEXT,
      params_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_calc_ship_name ON calculation_results(ship_name);
    CREATE INDEX IF NOT EXISTS idx_calc_params_hash ON calculation_results(params_hash);
    CREATE INDEX IF NOT EXISTS idx_calc_created_at ON calculation_results(created_at);

    CREATE TABLE IF NOT EXISTS anomaly_records (
      id TEXT PRIMARY KEY,
      calculation_id TEXT NOT NULL,
      anomaly_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      affected_field TEXT NOT NULL,
      raw_value TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculation_id) REFERENCES calculation_results(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_anomaly_calc_id ON anomaly_records(calculation_id);

    CREATE TABLE IF NOT EXISTS trace_info (
      id TEXT PRIMARY KEY,
      calculation_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      source TEXT NOT NULL,
      formula TEXT NOT NULL,
      standard TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculation_id) REFERENCES calculation_results(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trace_calc_id ON trace_info(calculation_id);
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}
