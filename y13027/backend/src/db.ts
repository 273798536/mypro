import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'reconciliation.db');
export const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reconciliation_records (
      id TEXT PRIMARY KEY,
      business_no TEXT NOT NULL UNIQUE,
      business_date TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_code TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      primary_caliber TEXT NOT NULL,
      secondary_caliber TEXT,
      status TEXT NOT NULL,
      current_conclusion TEXT,
      is_dual_caliber_conflict INTEGER NOT NULL DEFAULT 0,
      is_split_repayment INTEGER NOT NULL DEFAULT 0,
      split_parent_id TEXT,
      boundary_sample_tag TEXT,
      exception_queue_id TEXT,
      remark TEXT,
      operator TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS exception_queue (
      id TEXT PRIMARY KEY,
      reconciliation_id TEXT NOT NULL,
      caliber_filter TEXT NOT NULL,
      reason TEXT NOT NULL,
      severity TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (reconciliation_id) REFERENCES reconciliation_records(id)
    );

    CREATE TABLE IF NOT EXISTS history_change_logs (
      id TEXT PRIMARY KEY,
      reconciliation_id TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      previous_conclusion TEXT,
      new_conclusion TEXT,
      previous_remark TEXT,
      new_remark TEXT,
      previous_status TEXT,
      new_status TEXT,
      change_reason TEXT NOT NULL,
      supplementary_materials TEXT,
      previous_supplementary_materials TEXT,
      new_supplementary_materials TEXT,
      FOREIGN KEY (reconciliation_id) REFERENCES reconciliation_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_rec_status ON reconciliation_records(status);
    CREATE INDEX IF NOT EXISTS idx_rec_date ON reconciliation_records(business_date);
    CREATE INDEX IF NOT EXISTS idx_rec_conflict ON reconciliation_records(is_dual_caliber_conflict);
    CREATE INDEX IF NOT EXISTS idx_exc_active ON exception_queue(is_active);
    CREATE INDEX IF NOT EXISTS idx_hist_rec ON history_change_logs(reconciliation_id);
  `);

  try { db.exec('ALTER TABLE history_change_logs ADD COLUMN previous_supplementary_materials TEXT'); } catch (_) {}
  try { db.exec('ALTER TABLE history_change_logs ADD COLUMN new_supplementary_materials TEXT'); } catch (_) {}
}
