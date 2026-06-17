const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sensitive_word.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensitive_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name TEXT NOT NULL,
      rule_pattern TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sample_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      batch_name TEXT NOT NULL,
      description TEXT,
      source TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT UNIQUE NOT NULL,
      batch_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sample_type TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      auto_result TEXT,
      auto_hit_rules TEXT,
      final_result TEXT,
      is_confirmed INTEGER DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES sample_batches(batch_id)
    );

    CREATE TABLE IF NOT EXISTS correction_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT NOT NULL,
      old_result TEXT,
      new_result TEXT NOT NULL,
      reason TEXT NOT NULL,
      operator TEXT DEFAULT 'system',
      corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES test_samples(sample_id)
    );

    CREATE INDEX IF NOT EXISTS idx_samples_batch ON test_samples(batch_id);
    CREATE INDEX IF NOT EXISTS idx_samples_type ON test_samples(sample_type);
    CREATE INDEX IF NOT EXISTS idx_correction_sample ON correction_history(sample_id);
  `);
}

function getDb() {
  return db;
}

module.exports = {
  initDatabase,
  getDb
};
