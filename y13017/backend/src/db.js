const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'dispute.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    case_no TEXT NOT NULL,
    card_no TEXT,
    txn_date TEXT,
    txn_amount REAL,
    txn_currency TEXT,
    approval_no TEXT,
    merchant TEXT,
    dispute_type TEXT,
    tax_amount REAL,
    exchange_rate REAL,
    settle_amount REAL,
    settle_currency TEXT,
    remark TEXT,
    status TEXT NOT NULL DEFAULT 'pending_materials',
    source_email_id TEXT,
    is_manual_override INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_case_no ON disputes(case_no);
  CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    source_email_id TEXT,
    is_late_arrival INTEGER DEFAULT 0,
    arrival_batch_no TEXT,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_attachments_dispute ON attachments(dispute_id);

  CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    message_id TEXT,
    subject TEXT,
    sender TEXT,
    recipient TEXT,
    sent_date TEXT,
    raw_body TEXT,
    file_name TEXT,
    import_batch_no TEXT NOT NULL,
    imported_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_emails_import_batch ON emails(import_batch_no);

  CREATE TABLE IF NOT EXISTS timeline (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_text TEXT NOT NULL,
    operator TEXT,
    source_type TEXT,
    source_email_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_timeline_dispute ON timeline(dispute_id);
  CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON timeline(event_type);

  CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    batch_no TEXT NOT NULL,
    email_count INTEGER DEFAULT 0,
    dispute_count INTEGER DEFAULT 0,
    attachment_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_batch_no ON import_batches(batch_no);
`);

module.exports = db;
