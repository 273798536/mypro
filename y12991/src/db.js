const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'audit.db');
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已连接到 SQLite 数据库:', DB_PATH);
  }
});

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function initSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source_env TEXT NOT NULL,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        import_batch TEXT NOT NULL,
        imported_by TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        remark TEXT,
        version INTEGER DEFAULT 1,
        parent_id TEXT,
        is_latest INTEGER DEFAULT 1
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS migration_records (
        id TEXT PRIMARY KEY,
        migration_name TEXT NOT NULL,
        environment TEXT NOT NULL,
        execution_count INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        current_review_round_id TEXT,
        lock_wait_issue INTEGER DEFAULT 0,
        lock_wait_material_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS review_rounds (
        id TEXT PRIMARY KEY,
        migration_record_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        reviewer TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        conclusion_summary TEXT,
        FOREIGN KEY (migration_record_id) REFERENCES migration_records(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS review_items (
        id TEXT PRIMARY KEY,
        review_round_id TEXT NOT NULL,
        material_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        initial_conclusion TEXT,
        final_conclusion TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reason TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        FOREIGN KEY (review_round_id) REFERENCES review_rounds(id),
        FOREIGN KEY (material_id) REFERENCES materials(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        operator TEXT NOT NULL,
        operated_at TEXT NOT NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS conclusion_snapshots (
        id TEXT PRIMARY KEY,
        review_item_id TEXT NOT NULL,
        snapshot_version INTEGER NOT NULL,
        conclusion_text TEXT,
        status TEXT,
        snapshot_by TEXT NOT NULL,
        snapshot_at TEXT NOT NULL,
        FOREIGN KEY (review_item_id) REFERENCES review_items(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        migration_record_id TEXT NOT NULL,
        review_round_id TEXT,
        report_type TEXT NOT NULL,
        content_json TEXT NOT NULL,
        generated_by TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        FOREIGN KEY (migration_record_id) REFERENCES migration_records(id),
        FOREIGN KEY (review_round_id) REFERENCES review_rounds(id)
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_materials_batch ON materials(import_batch)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_migration_status ON migration_records(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_review_rounds_migration ON review_rounds(migration_record_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_review_items_round ON review_items(review_round_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_item ON conclusion_snapshots(review_item_id)`);

      console.log('数据库表结构初始化完成');
      resolve();
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
  initSchema
};
