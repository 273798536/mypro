import { getDb } from './database.js'

const DDL = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  source_db TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  delay_count INTEGER DEFAULT 0,
  schema_diff_count INTEGER DEFAULT 0,
  index_suggestion_count INTEGER DEFAULT 0,
  issue_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delay_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  db_instance TEXT NOT NULL,
  master_lsn TEXT,
  replica_lsn TEXT,
  delay_seconds REAL NOT NULL,
  threshold_seconds REAL DEFAULT 1.0,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id)
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  db_instance TEXT NOT NULL,
  schema_name TEXT,
  table_name TEXT,
  detail TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id)
);

CREATE TABLE IF NOT EXISTS schema_diffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  issue_id INTEGER,
  object_type TEXT NOT NULL,
  object_name TEXT NOT NULL,
  master_def TEXT,
  replica_def TEXT,
  diff_summary TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(run_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE TABLE IF NOT EXISTS index_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  issue_id INTEGER,
  table_name TEXT NOT NULL,
  columns TEXT NOT NULL,
  advice_type TEXT NOT NULL,
  reason TEXT,
  impact TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(run_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  db_user TEXT NOT NULL,
  host TEXT NOT NULL,
  privileges TEXT NOT NULL,
  granted_by TEXT,
  granted_at TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(run_id)
);

CREATE TABLE IF NOT EXISTS handling_opinions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  opinion_text TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE TABLE IF NOT EXISTS review_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  reviewer TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  previous_status TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id)
);
`

export function migrate(): void {
  const db = getDb()
  db.exec(DDL)
}

export function generateRunId(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const rand = Math.random().toString(16).slice(2, 6)
  return `run-${stamp}-${rand}`
}

export function isSeeded(): boolean {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) AS c FROM runs').get() as { c: number }
  return row.c > 0
}
