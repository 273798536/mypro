import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pool_diagnosis.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagnosis_batch (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      operator TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      data_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      raw_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagnosis_result (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      pool_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      description TEXT NOT NULL,
      affected_connections TEXT,
      suggestions TEXT,
      raw_data TEXT,
      FOREIGN KEY (batch_id) REFERENCES diagnosis_batch(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      batch_id TEXT,
      description TEXT NOT NULL,
      reason TEXT,
      snapshot_before TEXT,
      snapshot_after TEXT,
      approver_id TEXT,
      approver_name TEXT,
      changes TEXT,
      FOREIGN KEY (batch_id) REFERENCES diagnosis_batch(id)
    );

    CREATE TABLE IF NOT EXISTS version_snapshot (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      data TEXT NOT NULL,
      checksum TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES diagnosis_batch(id)
    );

    CREATE TABLE IF NOT EXISTS data_dictionary (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dictionary_version (
      id TEXT PRIMARY KEY,
      dictionary_id TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      version INTEGER NOT NULL,
      changed_by TEXT NOT NULL,
      change_time INTEGER NOT NULL,
      change_reason TEXT,
      FOREIGN KEY (dictionary_id) REFERENCES data_dictionary(id)
    );

    CREATE TABLE IF NOT EXISTS permission_request (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requested_permission TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      approver_id TEXT,
      approver_name TEXT,
      approved_at INTEGER,
      reject_reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boundary_case (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      test_data TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO user (id, name, role, permissions) VALUES (?, ?, ?, ?)
    `);
    insertUser.run('u001', '张明', 'sre_oncall', 'import,diagnose,download');
    insertUser.run('u002', '李华', 'sre_reviewer', 'import,diagnose,download,approve,audit');
    insertUser.run('u003', '王芳', 'admin', 'all');
  }

  const dictCount = db.prepare('SELECT COUNT(*) as count FROM data_dictionary').get() as { count: number };
  if (dictCount.count === 0) {
    const insertDict = db.prepare(`
      INSERT INTO data_dictionary (id, key, value, description, version, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const now = Math.floor(Date.now() / 1000);
    insertDict.run('d001', 'pool.max_connections_warning', '80', '连接池使用率告警阈值(%)', 1, 'u003', now);
    insertDict.run('d002', 'pool.max_connections_critical', '95', '连接池使用率危险阈值(%)', 1, 'u003', now);
    insertDict.run('d003', 'pool.waiting_warning', '5', '等待队列告警阈值', 1, 'u003', now);
    insertDict.run('d004', 'pool.timeout_warning', '10', '超时次数告警阈值', 1, 'u003', now);
    insertDict.run('d005', 'pool.error_rate_warning', '5', '错误率告警阈值(%)', 1, 'u003', now);
  }
};

export default db;
