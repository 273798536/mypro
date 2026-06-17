import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'tickets.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_no TEXT UNIQUE NOT NULL,
      customer_issue TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_version INTEGER NOT NULL DEFAULT 1,
      latest_version INTEGER NOT NULL DEFAULT 1,
      locked_version INTEGER,
      has_sample_leak BOOLEAN NOT NULL DEFAULT 0,
      has_manual_mark BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_versions (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      model_version TEXT,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      is_locked BOOLEAN NOT NULL DEFAULT 0,
      locked_by TEXT,
      locked_at DATETIME,
      created_by TEXT NOT NULL,
      change_note TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      UNIQUE(ticket_id, version)
    );

    CREATE TABLE IF NOT EXISTS evidences (
      id TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      ticket_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'import',
      is_sample_leak BOOLEAN NOT NULL DEFAULT 0,
      import_batch TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (version_id) REFERENCES ticket_versions(id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      version INTEGER,
      action TEXT NOT NULL,
      operator TEXT NOT NULL,
      detail TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_versions_ticket ON ticket_versions(ticket_id, version DESC);
    CREATE INDEX IF NOT EXISTS idx_evidences_version ON evidences(version_id);
    CREATE INDEX IF NOT EXISTS idx_evidences_leak ON evidences(is_sample_leak);
    CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_logs(ticket_id, created_at DESC);
  `);
}
