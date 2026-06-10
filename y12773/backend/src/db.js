const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'pesticide_trace.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reagent_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT NOT NULL,
      reagent_name TEXT NOT NULL,
      specification TEXT,
      manufacturer TEXT,
      arrival_date TEXT,
      quantity REAL,
      unit TEXT,
      supplier TEXT,
      remark TEXT,
      import_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(batch_no, reagent_name)
    );

    CREATE TABLE IF NOT EXISTS pesticide_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      test_item TEXT NOT NULL,
      test_value REAL,
      limit_value REAL,
      unit TEXT,
      test_method TEXT,
      test_date TEXT,
      tester TEXT,
      result_status TEXT NOT NULL DEFAULT 'IMPORTED',
      conclusion TEXT,
      reviewer TEXT,
      review_reason TEXT,
      review_comment TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES reagent_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      reviewer TEXT,
      review_reason TEXT,
      review_comment TEXT,
      old_value REAL,
      new_value REAL,
      old_conclusion TEXT,
      new_conclusion TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (test_id) REFERENCES pesticide_tests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS import_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      import_count INTEGER DEFAULT 0,
      update_count INTEGER DEFAULT 0,
      skip_count INTEGER DEFAULT 0,
      operator TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tests_batch ON pesticide_tests(batch_id);
    CREATE INDEX IF NOT EXISTS idx_tests_status ON pesticide_tests(result_status);
    CREATE INDEX IF NOT EXISTS idx_history_test ON review_history(test_id);
  `);
}

initSchema();

module.exports = db;
