import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/database.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS liability_records (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE,
      ticket_id TEXT NOT NULL,
      ticket_number TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      agent_name TEXT,
      agent_id TEXT,
      department TEXT,
      sla_breach_type TEXT,
      sla_breach_duration INTEGER,
      compensation_amount REAL NOT NULL DEFAULT 0,
      compensation_type TEXT,
      escalation_level INTEGER,
      transfer_count INTEGER,
      responsible_party TEXT,
      liability_reason TEXT,
      status TEXT NOT NULL,
      data_sources TEXT,
      source_session_summary_id TEXT,
      source_sla_rule_id TEXT,
      source_compensation_approval_id TEXT,
      source_supplier_statement_id TEXT,
      source_approval_email_id TEXT,
      occurrence_date TEXT NOT NULL,
      submitted_by TEXT,
      submitted_at TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      rejected_by TEXT,
      rejected_at TEXT,
      rejection_reason TEXT,
      second_confirmed_by TEXT,
      second_confirmed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      dirty_record_types TEXT,
      original_content TEXT,
      handling_opinion TEXT,
      is_corrected INTEGER NOT NULL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS history_records (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      operator_role TEXT NOT NULL,
      previous_values TEXT,
      new_values TEXT,
      changed_fields TEXT,
      change_reason TEXT,
      duplicate_strategy TEXT,
      sensitive_fields_handled TEXT,
      timestamp TEXT NOT NULL,
      ip_address TEXT,
      FOREIGN KEY (record_id) REFERENCES liability_records(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dirty_record_logs (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      dirty_type TEXT NOT NULL,
      field_name TEXT,
      expected_value TEXT,
      actual_value TEXT,
      detected_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      resolution TEXT,
      FOREIGN KEY (record_id) REFERENCES liability_records(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS export_logs (
      id TEXT PRIMARY KEY,
      exported_by TEXT NOT NULL,
      exported_by_name TEXT NOT NULL,
      export_type TEXT NOT NULL,
      record_count INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      is_masked INTEGER NOT NULL,
      masked_fields TEXT,
      filters TEXT,
      exported_at TEXT NOT NULL,
      checksum TEXT NOT NULL
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_liability_ticket ON liability_records(ticket_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_liability_status ON liability_records(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_liability_date ON liability_records(occurrence_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_history_record ON history_records(record_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_history_time ON history_records(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_dirty_record ON dirty_record_logs(record_id)`);
  });
}

export default db;
