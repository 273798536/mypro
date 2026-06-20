import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dashboard.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS eval_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    index_type TEXT NOT NULL,
    index_params TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eval_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    recall_at_1 REAL,
    recall_at_10 REAL,
    recall_at_100 REAL,
    precision_at_1 REAL,
    avg_latency_ms REAL,
    p99_latency_ms REAL,
    qps REAL,
    memory_usage_mb REAL,
    cpu_usage REAL,
    index_size_gb REAL,
    build_time_s REAL,
    overall_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sample_evidences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    query_id TEXT NOT NULL,
    query_text TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    score REAL,
    rank INTEGER,
    evidence_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS manual_judgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    evidence_id INTEGER,
    judgment_type TEXT NOT NULL,
    original_value TEXT,
    modified_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    judged_by TEXT NOT NULL,
    is_temporary INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_id) REFERENCES sample_evidences(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS material_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    source_name TEXT NOT NULL,
    target_name TEXT NOT NULL,
    link_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    verified_by TEXT,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS feature_delays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    feature_name TEXT NOT NULL,
    expected_date DATE NOT NULL,
    actual_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    suspected_reason TEXT,
    impact_scope TEXT,
    affected_samples INTEGER,
    confirmed_by TEXT,
    confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS param_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    param_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    change_reason TEXT,
    result_impact TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    comment_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES eval_tasks(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_model_version ON eval_tasks(model_version);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON eval_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_evidences_task ON sample_evidences(task_id);
  CREATE INDEX IF NOT EXISTS idx_evidences_correct ON sample_evidences(is_correct);
  CREATE INDEX IF NOT EXISTS idx_judgments_task ON manual_judgments(task_id);
  CREATE INDEX IF NOT EXISTS idx_delays_status ON feature_delays(status);
`);

console.log('Database initialized successfully at:', dbPath);
db.close();
