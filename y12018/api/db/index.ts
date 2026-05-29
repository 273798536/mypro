import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '..', 'data', 'prize.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDatabase(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      status TEXT NOT NULL CHECK(status IN ('processing', 'completed', 'partial_failed')),
      total_count INTEGER NOT NULL DEFAULT 0,
      paid_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tied_rank_groups (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      rank INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS distributions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      player_name TEXT NOT NULL,
      rank INTEGER NOT NULL,
      is_tied INTEGER NOT NULL DEFAULT 0,
      tied_rank_group_id TEXT REFERENCES tied_rank_groups(id),
      gross_prize REAL NOT NULL,
      total_deductions REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL,
      tax_rate REAL NOT NULL,
      tax_amount REAL NOT NULL,
      net_amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'failed', 'disputed')),
      bank_card_last4 TEXT,
      has_dispute INTEGER NOT NULL DEFAULT 0,
      has_duplicate_resend INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deductions (
      id TEXT PRIMARY KEY,
      distribution_id TEXT NOT NULL REFERENCES distributions(id),
      type TEXT NOT NULL CHECK(type IN ('sponsor', 'penalty', 'other')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id TEXT PRIMARY KEY,
      distribution_id TEXT NOT NULL REFERENCES distributions(id),
      field TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      reason TEXT NOT NULL,
      source_note TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT 'finance',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bad_rows (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      raw_line TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      error_type TEXT NOT NULL CHECK(error_type IN ('empty_row', 'missing_column', 'format_error', 'invalid_deduction', 'invalid_bank_receipt')),
      error_description TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_distributions_event ON distributions(event_id);
    CREATE INDEX IF NOT EXISTS idx_distributions_batch ON distributions(batch_id);
    CREATE INDEX IF NOT EXISTS idx_distributions_status ON distributions(status);
    CREATE INDEX IF NOT EXISTS idx_distributions_tied ON distributions(is_tied);
    CREATE INDEX IF NOT EXISTS idx_distributions_dispute ON distributions(has_dispute);
    CREATE INDEX IF NOT EXISTS idx_corrections_distribution ON corrections(distribution_id);
    CREATE INDEX IF NOT EXISTS idx_corrections_created ON corrections(created_at);
    CREATE INDEX IF NOT EXISTS idx_bad_rows_event ON bad_rows(event_id);
  `);
}
