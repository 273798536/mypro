const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS return_applications (
      id TEXT PRIMARY KEY,
      application_no TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      member_canceled_at INTEGER,
      exception_reserved INTEGER NOT NULL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS return_batches (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      batch_no TEXT UNIQUE NOT NULL,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      previous_status TEXT,
      quality_status TEXT,
      freeze_reason TEXT,
      manual_reason TEXT,
      inspected_by TEXT,
      inspected_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (application_id) REFERENCES return_applications(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      application_id TEXT,
      type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at INTEGER NOT NULL,
      is_exception INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (batch_id) REFERENCES return_batches(id),
      FOREIGN KEY (application_id) REFERENCES return_applications(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS approval_emails (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      batch_id TEXT,
      email_subject TEXT NOT NULL,
      email_content TEXT NOT NULL,
      sender TEXT NOT NULL,
      sent_at INTEGER NOT NULL,
      is_exception INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (application_id) REFERENCES return_applications(id),
      FOREIGN KEY (batch_id) REFERENCES return_batches(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      operator TEXT NOT NULL,
      reason TEXT,
      operation_time INTEGER NOT NULL,
      is_reentry INTEGER NOT NULL DEFAULT 0,
      reentry_type TEXT,
      FOREIGN KEY (batch_id) REFERENCES return_batches(id),
      FOREIGN KEY (application_id) REFERENCES return_applications(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS failed_records (
      id TEXT PRIMARY KEY,
      record_type TEXT NOT NULL,
      record_data TEXT NOT NULL,
      error_message TEXT NOT NULL,
      failed_at INTEGER NOT NULL,
      source TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS data_signatures (
      id TEXT PRIMARY KEY,
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      signature TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_application_no ON return_applications(application_no)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_batch_application ON return_batches(application_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_batch_no ON return_batches(batch_no)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_status_history_batch ON status_history(batch_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_attachments_batch ON attachments(batch_id)`);
  });
}

module.exports = db;
