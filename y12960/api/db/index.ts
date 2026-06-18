import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'app.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'dev',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permission (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (role_id) REFERENCES role(id)
    );

    CREATE TABLE IF NOT EXISTS change_record (
      id TEXT PRIMARY KEY,
      record_no TEXT UNIQUE NOT NULL,
      table_name TEXT NOT NULL,
      field_name TEXT NOT NULL,
      change_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      source_info TEXT NOT NULL,
      schema_before TEXT NOT NULL,
      schema_after TEXT NOT NULL,
      handling_opinion TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES user(id)
    );

    CREATE TABLE IF NOT EXISTS anomaly (
      id TEXT PRIMARY KEY,
      change_record_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'MEDIUM',
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (change_record_id) REFERENCES change_record(id)
    );

    CREATE TABLE IF NOT EXISTS schema_version (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      table_name TEXT NOT NULL,
      fields TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES user(id)
    );

    CREATE TABLE IF NOT EXISTS migration_log (
      id TEXT PRIMARY KEY,
      change_record_id TEXT NOT NULL,
      synced BOOLEAN DEFAULT FALSE,
      sync_at DATETIME,
      source_write_back TEXT,
      synced_by TEXT,
      FOREIGN KEY (change_record_id) REFERENCES change_record(id),
      FOREIGN KEY (synced_by) REFERENCES user(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user(id)
    );

    CREATE INDEX IF NOT EXISTS idx_change_record_status ON change_record(status);
    CREATE INDEX IF NOT EXISTS idx_change_record_table ON change_record(table_name);
    CREATE INDEX IF NOT EXISTS idx_change_record_created ON change_record(created_at);
    CREATE INDEX IF NOT EXISTS idx_anomaly_record ON anomaly(change_record_id);
    CREATE INDEX IF NOT EXISTS idx_migration_record ON migration_log(change_record_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
  `);

  const roleCount = db.prepare('SELECT COUNT(*) as count FROM role').get() as { count: number };
  if (roleCount.count === 0) {
    const insertRole = db.prepare(
      'INSERT INTO role (id, name, description, permissions) VALUES (?, ?, ?, ?)'
    );
    insertRole.run('role_admin', '管理员', '系统管理员，拥有所有权限', '["*"]');
    insertRole.run(
      'role_bi_analyst',
      'BI分析师',
      '可导入、处理变更记录',
      '["change:import", "change:edit", "change:export", "schema:compare", "schema:export"]'
    );
    insertRole.run(
      'role_dev',
      '研发团队',
      '仅查看权限，可筛选不可用记录',
      '["change:view", "change:export", "schema:view"]'
    );
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(
      'INSERT INTO user (id, username, display_name, email, role) VALUES (?, ?, ?, ?, ?)'
    );
    insertUser.run('user_1', 'admin', '系统管理员', 'admin@example.com', 'admin');
    insertUser.run('user_2', 'bi_analyst', '张分析师', 'zhang@example.com', 'bi_analyst');
    insertUser.run('user_3', 'dev_user', '李开发', 'li@example.com', 'dev');
  }
}
