const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

function getDbPath() {
  const dataDir = process.env.MD_INSPECT_DATA_DIR || process.cwd();
  return path.join(dataDir, 'inspection.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  const dbExists = fs.existsSync(dbPath);
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (!dbExists) {
    createTables(db);
  }

  dbInstance = db;
  return db;
}

function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      source_type TEXT NOT NULL,
      file_name TEXT,
      import_mode TEXT NOT NULL DEFAULT 'append',
      status TEXT NOT NULL DEFAULT 'pending',
      operator TEXT,
      total_rows INTEGER DEFAULT 0,
      success_rows INTEGER DEFAULT 0,
      failed_rows INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inspection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      original_line_no INTEGER,
      device_id TEXT,
      device_name TEXT,
      department TEXT,
      inspection_date DATE,
      inspector TEXT,
      inspection_result TEXT,
      issues TEXT,
      next_inspection_date DATE,
      status TEXT DEFAULT 'active',
      is_valid INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(batch_id)
    );

    CREATE TABLE IF NOT EXISTS calibration_certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      original_line_no INTEGER,
      device_id TEXT,
      device_name TEXT,
      certificate_no TEXT,
      calibration_date DATE,
      expiry_date DATE,
      calibration_agency TEXT,
      calibration_result TEXT,
      status TEXT DEFAULT 'valid',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(batch_id)
    );

    CREATE TABLE IF NOT EXISTS repair_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      original_line_no INTEGER,
      device_id TEXT,
      device_name TEXT,
      department TEXT,
      fault_description TEXT,
      quote_amount DECIMAL(10,2),
      quote_date DATE,
      vendor TEXT,
      status TEXT DEFAULT 'pending',
      approval_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(batch_id)
    );

    CREATE TABLE IF NOT EXISTS change_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      operator TEXT,
      operation_type TEXT NOT NULL,
      batch_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS async_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT UNIQUE NOT NULL,
      task_type TEXT NOT NULL,
      payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      error_stack TEXT,
      last_attempted_at DATETIME,
      available_after DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS validation_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      source_type TEXT,
      original_line_no INTEGER,
      record_id INTEGER,
      error_code TEXT,
      error_message TEXT,
      field_name TEXT,
      field_value TEXT,
      severity TEXT DEFAULT 'error',
      is_fixed INTEGER DEFAULT 0,
      fixed_by TEXT,
      fixed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(batch_id)
    );

    CREATE INDEX IF NOT EXISTS idx_inspection_device ON inspection_records(device_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_date ON inspection_records(inspection_date);
    CREATE INDEX IF NOT EXISTS idx_calibration_device ON calibration_certificates(device_id);
    CREATE INDEX IF NOT EXISTS idx_calibration_expiry ON calibration_certificates(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_repair_device ON repair_quotes(device_id);
    CREATE INDEX IF NOT EXISTS idx_history_record ON change_history(record_type, record_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON async_tasks(status, available_after);
    CREATE INDEX IF NOT EXISTS idx_errors_batch ON validation_errors(batch_id);
  `);
}

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDbPath
};
