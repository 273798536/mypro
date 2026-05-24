const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const WORKSPACE_DIR = process.cwd();
const DATA_DIR = path.join(WORKSPACE_DIR, '.wra-data');
const DB_PATH = path.join(DATA_DIR, 'audit.db');

let db = null;

function isInitialized() {
  return fs.existsSync(DB_PATH);
}

function ensureInitialized() {
  if (!isInitialized()) {
    throw new Error('工作目录未初始化，请先运行: wra init');
  }
}

function getDb() {
  if (!db) {
    ensureInitialized();
    db = new sqlite3.Database(DB_PATH);
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA foreign_keys = ON');
    });
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function initWorkspace(name = 'default') {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const importsDir = path.join(DATA_DIR, 'imports');
  const exportsDir = path.join(DATA_DIR, 'exports');
  const logsDir = path.join(DATA_DIR, 'logs');
  
  [importsDir, exportsDir, logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      
      db.serialize(() => {
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA foreign_keys = ON');

        const tables = `
          CREATE TABLE IF NOT EXISTS workspace (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS return_applications (
            id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            sku_name TEXT,
            apply_qty INTEGER NOT NULL,
            apply_date TEXT NOT NULL,
            supplier_code TEXT,
            supplier_name TEXT,
            warehouse_code TEXT,
            reason TEXT,
            original_line_no INTEGER,
            source_file TEXT,
            import_batch_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_no, sku_code)
          );

          CREATE TABLE IF NOT EXISTS inspection_photos (
            id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            photo_url TEXT,
            photo_name TEXT,
            inspection_result TEXT,
            inspection_qty INTEGER,
            inspector TEXT,
            inspection_date TEXT,
            original_line_no INTEGER,
            source_file TEXT,
            import_batch_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_no, sku_code, photo_name)
          );

          CREATE TABLE IF NOT EXISTS logistics_receipts (
            id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            tracking_no TEXT,
            shipped_qty INTEGER,
            received_qty INTEGER,
            shipping_date TEXT,
            receiving_date TEXT,
            carrier TEXT,
            driver TEXT,
            original_line_no INTEGER,
            source_file TEXT,
            import_batch_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_no, sku_code, tracking_no)
          );

          CREATE TABLE IF NOT EXISTS sms_snapshots (
            id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            sku_code TEXT,
            sms_content TEXT,
            sender TEXT,
            receiver TEXT,
            send_time TEXT,
            confirmed_qty INTEGER,
            photo_ref TEXT,
            original_line_no INTEGER,
            source_file TEXT,
            import_batch_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_no, sender, receiver, send_time)
          );

          CREATE TABLE IF NOT EXISTS exception_photos (
            id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            photo_url TEXT,
            photo_name TEXT,
            exception_type TEXT,
            exception_desc TEXT,
            exception_qty INTEGER,
            reporter TEXT,
            report_date TEXT,
            original_line_no INTEGER,
            source_file TEXT,
            import_batch_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_no, sku_code, photo_name)
          );

          CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            sku_name TEXT,
            supplier_code TEXT,
            supplier_name TEXT,
            warehouse_code TEXT,
            
            apply_qty INTEGER DEFAULT 0,
            inspection_qty INTEGER DEFAULT 0,
            inspection_result TEXT,
            shipped_qty INTEGER DEFAULT 0,
            received_qty INTEGER DEFAULT 0,
            exception_qty INTEGER DEFAULT 0,
            sms_confirmed_qty INTEGER DEFAULT 0,
            
            supplier_accepted_qty INTEGER DEFAULT 0,
            supplier_rejected_qty INTEGER DEFAULT 0,
            supplier_pending_qty INTEGER DEFAULT 0,
            
            final_qty INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            judgment TEXT,
            judgment_note TEXT,
            judged_by TEXT,
            judged_at TEXT,
            
            data_quality_score INTEGER DEFAULT 0,
            has_warning INTEGER DEFAULT 0,
            warning_messages TEXT,
            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_no, sku_code)
          );

          CREATE TABLE IF NOT EXISTS import_batches (
            id TEXT PRIMARY KEY,
            source_type TEXT NOT NULL,
            source_file TEXT NOT NULL,
            record_count INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            fail_count INTEGER DEFAULT 0,
            imported_by TEXT,
            note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS import_failures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            original_line_no INTEGER,
            raw_data TEXT,
            error_reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id TEXT NOT NULL,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            change_type TEXT NOT NULL,
            changed_by TEXT,
            change_note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS judgments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id TEXT NOT NULL,
            batch_no TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            judgment_type TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            judge_note TEXT,
            judged_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_level TEXT NOT NULL,
            operation TEXT NOT NULL,
            detail TEXT,
            operator TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `;

        db.exec(tables, (err) => {
          if (err) {
            reject(err);
            return;
          }

          const indexes = `
            CREATE INDEX IF NOT EXISTS idx_records_batch ON records(batch_no);
            CREATE INDEX IF NOT EXISTS idx_records_sku ON records(sku_code);
            CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
            CREATE INDEX IF NOT EXISTS idx_history_record ON change_history(record_id);
            CREATE INDEX IF NOT EXISTS idx_history_batch ON change_history(batch_no);
            CREATE INDEX IF NOT EXISTS idx_failures_batch ON import_failures(batch_id);
          `;

          db.exec(indexes, (err) => {
            if (err) {
              reject(err);
              return;
            }

            db.run('INSERT OR IGNORE INTO workspace (name) VALUES (?)', [name], (err) => {
              if (err) reject(err);
              else resolve({ success: true, dataDir: DATA_DIR, dbPath: DB_PATH });
            });
          });
        });
      });
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function serialize(callback) {
  getDb().serialize(callback);
}

function beginTransaction() {
  return exec('BEGIN TRANSACTION');
}

function commitTransaction() {
  return exec('COMMIT');
}

function rollbackTransaction() {
  return exec('ROLLBACK');
}

function logOperation(level, operation, detail, operator = 'system') {
  return run(
    'INSERT INTO system_logs (log_level, operation, detail, operator) VALUES (?, ?, ?, ?)',
    [level, operation, detail, operator]
  );
}

module.exports = {
  WORKSPACE_DIR,
  DATA_DIR,
  DB_PATH,
  isInitialized,
  ensureInitialized,
  getDb,
  closeDb,
  initWorkspace,
  run,
  get,
  all,
  exec,
  serialize,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  logOperation
};
