const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db = null;

async function initDatabase() {
  const dbPath = path.join(__dirname, '../../data/queue.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS raw_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file TEXT NOT NULL,
      original_row_number INTEGER NOT NULL,
      raw_data TEXT NOT NULL,
      parsed_data TEXT,
      import_batch_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_file, original_row_number)
    );

    CREATE TABLE IF NOT EXISTS task_queue (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      audit_result TEXT,
      cost_report TEXT,
      supplier_statement TEXT,
      approval_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      failure_type TEXT,
      failure_reason TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      next_retry_at DATETIME,
      manual_handler TEXT,
      compensation_amount DECIMAL(10, 2),
      compensation_note TEXT,
      close_reason TEXT,
      raw_import_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (raw_import_id) REFERENCES raw_imports(id)
    );

    CREATE INDEX IF NOT EXISTS idx_task_status ON task_queue(status);
    CREATE INDEX IF NOT EXISTS idx_task_material ON task_queue(material_id);
    CREATE INDEX IF NOT EXISTS idx_task_next_retry ON task_queue(next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_raw_import_batch ON raw_imports(import_batch_id);

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      failure_type TEXT,
      reason TEXT,
      operator TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES task_queue(id)
    );

    CREATE INDEX IF NOT EXISTS idx_status_history_task ON status_history(task_id);
  `);

  return db;
}

async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

module.exports = {
  initDatabase,
  getDatabase
};