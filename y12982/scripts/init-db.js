const { exec, DB_PATH, closeDb } = require('../db');

async function initDatabase() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      real_name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS slow_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_id TEXT UNIQUE NOT NULL,
      query_text TEXT NOT NULL,
      query_type TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      lock_wait_time_ms INTEGER DEFAULT 0,
      rows_scanned INTEGER,
      rows_returned INTEGER,
      execute_time TEXT NOT NULL,
      database_name TEXT,
      caller_ip TEXT,
      caller_user TEXT,
      severity TEXT DEFAULT 'warning',
      status TEXT DEFAULT 'pending',
      batch_id TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS inspection_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      batch_type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT DEFAULT 'running',
      slow_query_count INTEGER DEFAULT 0,
      backup_verified INTEGER DEFAULT 0,
      backup_total INTEGER DEFAULT 0,
      operator TEXT NOT NULL,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS inspection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT UNIQUE NOT NULL,
      batch_id TEXT NOT NULL,
      slow_query_id INTEGER,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT DEFAULT 'warning',
      status TEXT DEFAULT 'pending',
      handler TEXT,
      handle_opinion TEXT,
      handle_time TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (slow_query_id) REFERENCES slow_queries(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT UNIQUE NOT NULL,
      batch_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      plain_explanation TEXT,
      total_items INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,
      resolved_count INTEGER DEFAULT 0,
      reviewer TEXT,
      review_status TEXT DEFAULT 'draft',
      review_time TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trail_id TEXT UNIQUE NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      operator TEXT NOT NULL,
      reason TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS permission_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      change_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      username TEXT NOT NULL,
      old_permissions TEXT,
      new_permissions TEXT,
      change_type TEXT NOT NULL,
      approver TEXT,
      reason TEXT,
      audit_trail_id TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id TEXT UNIQUE NOT NULL,
      batch_id TEXT,
      backup_time TEXT NOT NULL,
      backup_size_bytes INTEGER,
      backup_path TEXT,
      verification_status TEXT DEFAULT 'pending',
      verification_time TEXT,
      verification_result TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_slow_queries_batch ON slow_queries(batch_id);
    CREATE INDEX IF NOT EXISTS idx_slow_queries_status ON slow_queries(status);
    CREATE INDEX IF NOT EXISTS idx_slow_queries_severity ON slow_queries(severity);
    CREATE INDEX IF NOT EXISTS idx_inspection_items_batch ON inspection_items(batch_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_items_status ON inspection_items(status);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_target ON audit_trail(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_operator ON audit_trail(operator);
  `);

  console.log('数据库初始化完成:', DB_PATH);
}

async function main() {
  try {
    await initDatabase();
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  main();
}

module.exports = { initDatabase, DB_PATH };
