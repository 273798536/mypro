const Database = require('better-sqlite3');
const path = require('path');

let dbInstance = null;
let dbPath = null;

function getDbPath() {
  if (dbPath) return dbPath;
  if (process.env.DB_PATH) {
    dbPath = process.env.DB_PATH;
  } else {
    dbPath = path.join(__dirname, '../../data/schema_drift.db');
  }
  return dbPath;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(getDbPath());
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

function resetDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  dbPath = null;
}

function setDbPath(p) {
  dbInstance = null;
  dbPath = p;
}

function initDatabase() {
  const db = getDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      current_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS data_dictionaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      batch_id INTEGER,
      table_name TEXT NOT NULL,
      column_name TEXT NOT NULL,
      data_type TEXT,
      is_nullable TEXT,
      default_value TEXT,
      comment TEXT,
      version TEXT NOT NULL,
      is_baseline INTEGER DEFAULT 0,
      import_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS drift_comparisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      baseline_version TEXT NOT NULL,
      target_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result_summary TEXT,
      total_changes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS drift_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comparison_id INTEGER NOT NULL,
      table_name TEXT NOT NULL,
      column_name TEXT,
      change_type TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      is_reviewed INTEGER DEFAULT 0,
      review_note TEXT,
      can_use_directly INTEGER DEFAULT 0,
      need_review_reason TEXT,
      FOREIGN KEY (comparison_id) REFERENCES drift_comparisons(id)
    );

    CREATE TABLE IF NOT EXISTS rollback_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comparison_id INTEGER NOT NULL,
      drift_detail_id INTEGER,
      rollback_sql TEXT NOT NULL,
      table_name TEXT NOT NULL,
      change_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      executed_at DATETIME,
      executor TEXT,
      rollback_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (comparison_id) REFERENCES drift_comparisons(id),
      FOREIGN KEY (drift_detail_id) REFERENCES drift_details(id)
    );

    CREATE TABLE IF NOT EXISTS index_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comparison_id INTEGER NOT NULL,
      table_name TEXT NOT NULL,
      index_name TEXT,
      index_type TEXT DEFAULT 'NORMAL',
      columns TEXT NOT NULL,
      suggestion_reason TEXT,
      priority TEXT DEFAULT 'medium',
      is_adopted INTEGER DEFAULT 0,
      adopted_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (comparison_id) REFERENCES drift_comparisons(id)
    );

    CREATE TABLE IF NOT EXISTS permission_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      source_type TEXT,
      source_ref TEXT,
      content TEXT,
      import_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS permission_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      permission_list_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      issues TEXT,
      conclusion TEXT,
      source_material_ref TEXT,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (permission_list_id) REFERENCES permission_lists(id)
    );

    CREATE TABLE IF NOT EXISTS slow_query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER,
      query_text TEXT NOT NULL,
      execution_time REAL,
      rows_examined INTEGER,
      rows_sent INTEGER,
      related_table TEXT,
      timestamp DATETIME,
      source_file TEXT,
      conclusion_ref INTEGER,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS status_transitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      operator TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      comparison_id INTEGER,
      report_type TEXT NOT NULL,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      export_time DATETIME,
      reviewer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (comparison_id) REFERENCES drift_comparisons(id)
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      batch_type TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_name TEXT,
      record_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      error_message TEXT,
      import_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_dict_work_order ON data_dictionaries(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_dict_version ON data_dictionaries(version);
    CREATE INDEX IF NOT EXISTS idx_comp_work_order ON drift_comparisons(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_detail_comparison ON drift_details(comparison_id);
    CREATE INDEX IF NOT EXISTS idx_rollback_comparison ON rollback_records(comparison_id);
    CREATE INDEX IF NOT EXISTS idx_index_comparison ON index_suggestions(comparison_id);
    CREATE INDEX IF NOT EXISTS idx_batch_work_order ON import_batches(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_batch_hash ON import_batches(file_hash);
    CREATE INDEX IF NOT EXISTS idx_slow_query_work_order ON slow_query_logs(work_order_id);
  `);
  
  return db;
}

module.exports = {
  getDb,
  initDatabase,
  resetDb,
  setDbPath,
  getDbPath
};
