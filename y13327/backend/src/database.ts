import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ocmr.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      original_cluster TEXT NOT NULL,
      final_cluster TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      citation_urls TEXT NOT NULL DEFAULT '[]',
      citation_status TEXT NOT NULL DEFAULT 'complete',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      reviewer TEXT NOT NULL,
      before_cluster TEXT NOT NULL,
      after_cluster TEXT NOT NULL,
      review_note TEXT NOT NULL DEFAULT '',
      screenshot_descriptions TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT NOT NULL DEFAULT '',
      new_value TEXT NOT NULL DEFAULT '',
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      change_note TEXT NOT NULL DEFAULT '',
      old_screenshot_refs TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_legacy INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS missing_citation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      missing_items TEXT NOT NULL DEFAULT '[]',
      reason TEXT NOT NULL,
      reason_detail TEXT NOT NULL DEFAULT '',
      impact_scope TEXT NOT NULL DEFAULT '{}',
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirmed_by TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gray_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gray_batch TEXT UNIQUE NOT NULL,
      report_date TEXT NOT NULL,
      sample_change TEXT NOT NULL,
      threshold_change TEXT NOT NULL,
      manual_review TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_ticket_no ON tickets(ticket_no);
    CREATE INDEX IF NOT EXISTS idx_review_records_ticket ON review_records(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_history_versions_ticket ON history_versions(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_screenshots_ticket ON screenshots(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_missing_citation_ticket ON missing_citation_records(ticket_id);
  `);
}

initDatabase();

export default db;
