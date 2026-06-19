import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.resolve(__dirname, '../data/workbench.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(): Database.Database {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','running','completed','conflict')),
      related_log_count INTEGER DEFAULT 0,
      conflict_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slow_query_logs (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      query_text TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      source_file TEXT NOT NULL,
      original_line_no INTEGER NOT NULL,
      is_duplicate INTEGER DEFAULT 0,
      import_round INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_slow_query_logs_batch ON slow_query_logs(batch_id);

    CREATE TABLE IF NOT EXISTS migration_scripts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL REFERENCES slow_query_logs(id),
      script_id TEXT NOT NULL REFERENCES migration_scripts(id),
      type TEXT NOT NULL CHECK(type IN ('schema_mismatch','index_conflict','performance_degradation')),
      severity TEXT NOT NULL CHECK(severity IN ('low','medium','high')),
      description TEXT NOT NULL,
      chart_data_ref TEXT,
      table_row_ref TEXT,
      conclusion_id TEXT REFERENCES conclusions(id),
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conflicts_log ON conflicts(log_id);
    CREATE INDEX IF NOT EXISTS idx_conflicts_script ON conflicts(script_id);

    CREATE TABLE IF NOT EXISTS backup_gaps (
      id TEXT PRIMARY KEY,
      original_line_no INTEGER NOT NULL,
      image_name TEXT,
      source_remark TEXT,
      source_table TEXT NOT NULL,
      source_record_id TEXT NOT NULL,
      description TEXT NOT NULL,
      conclusion_id TEXT REFERENCES conclusions(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conclusions (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      related_snapshot_id TEXT REFERENCES snapshots(id),
      immutable INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      schema_ddl TEXT NOT NULL,
      conclusion_id TEXT REFERENCES conclusions(id),
      captured_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS index_suggestions (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      suggested_index TEXT NOT NULL,
      reason TEXT NOT NULL,
      explanation TEXT NOT NULL,
      impact TEXT NOT NULL CHECK(impact IN ('low','medium','high')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS script_log_relations (
      script_id TEXT NOT NULL REFERENCES migration_scripts(id),
      log_id TEXT NOT NULL REFERENCES slow_query_logs(id),
      PRIMARY KEY (script_id, log_id)
    );

    CREATE TABLE IF NOT EXISTS suggestion_log_relations (
      suggestion_id TEXT NOT NULL REFERENCES index_suggestions(id),
      log_id TEXT NOT NULL REFERENCES slow_query_logs(id),
      PRIMARY KEY (suggestion_id, log_id)
    );
  `)

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
