import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'playback.db')

export function ensureDbDirectory(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

export function createDatabase(): Database.Database {
  ensureDbDirectory()
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS playback (
      id TEXT PRIMARY KEY,
      enterprise_name TEXT NOT NULL,
      batch_no TEXT NOT NULL,
      run_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      conclusion TEXT NOT NULL,
      conclusion_reason TEXT,
      last_operator TEXT,
      last_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approval_email (
      id TEXT PRIMARY KEY,
      playback_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      approver_name TEXT NOT NULL,
      approver_name_original TEXT,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      is_anomaly INTEGER NOT NULL DEFAULT 0,
      anomaly_note TEXT,
      FOREIGN KEY (playback_id) REFERENCES playback(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS normal_payment_record (
      id TEXT PRIMARY KEY,
      playback_id TEXT NOT NULL,
      enterprise_name TEXT NOT NULL,
      payment_month TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_at TEXT NOT NULL,
      FOREIGN KEY (playback_id) REFERENCES playback(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note (
      id TEXT PRIMARY KEY,
      playback_id TEXT NOT NULL,
      content TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (playback_id) REFERENCES playback(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history_record (
      id TEXT PRIMARY KEY,
      playback_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      field_changes_json TEXT,
      FOREIGN KEY (playback_id) REFERENCES playback(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS markdown_report (
      id TEXT PRIMARY KEY,
      playback_id TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (playback_id) REFERENCES playback(id) ON DELETE CASCADE
    );
  `)
}
