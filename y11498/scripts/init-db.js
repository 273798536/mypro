const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/finance-audit.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('开始初始化数据库...');

  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`
    CREATE TABLE IF NOT EXISTS travel_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_no TEXT UNIQUE NOT NULL,
      applicant_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      department TEXT,
      travel_start_date TEXT NOT NULL,
      travel_end_date TEXT NOT NULL,
      travel_destination TEXT NOT NULL,
      travel_purpose TEXT,
      estimated_accommodation_amount REAL,
      estimated_transportation_amount REAL,
      estimated_total_amount REAL,
      status TEXT DEFAULT 'pending',
      shared_trip_group_id TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      invoice_code TEXT,
      invoice_date TEXT NOT NULL,
      seller_name TEXT,
      seller_tax_no TEXT,
      buyer_name TEXT,
      buyer_tax_no TEXT,
      invoice_type TEXT,
      expense_category TEXT NOT NULL,
      expense_item TEXT,
      total_amount REAL NOT NULL,
      tax_amount REAL,
      total_with_tax REAL,
      applicant_id TEXT,
      applicant_name TEXT,
      travel_application_no TEXT,
      check_in_date TEXT,
      check_out_date TEXT,
      hotel_name TEXT,
      room_count INTEGER,
      flight_no TEXT,
      departure TEXT,
      arrival TEXT,
      departure_time TEXT,
      arrival_time TEXT,
      passenger_name TEXT,
      pdf_path TEXT,
      pdf_hash TEXT,
      is_duplicate BOOLEAN DEFAULT 0,
      duplicate_group_id TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (travel_application_no) REFERENCES travel_applications(application_no)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_expense_category ON invoices(expense_category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_travel_application_no ON invoices(travel_application_no)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_applicant_id ON invoices(applicant_id)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_no TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      payer_account TEXT,
      payer_name TEXT,
      payee_account TEXT,
      payee_name TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'CNY',
      payment_method TEXT,
      purpose TEXT,
      expense_category TEXT,
      applicant_id TEXT,
      applicant_name TEXT,
      travel_application_no TEXT,
      invoice_no TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (travel_application_no) REFERENCES travel_applications(application_no),
      FOREIGN KEY (invoice_no) REFERENCES invoices(invoice_no)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refund_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refund_no TEXT UNIQUE NOT NULL,
      refund_date TEXT NOT NULL,
      refund_from_account TEXT,
      refund_from_name TEXT,
      refund_to_account TEXT,
      refund_to_name TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'CNY',
      refund_reason TEXT,
      original_payment_no TEXT,
      applicant_id TEXT,
      applicant_name TEXT,
      travel_application_no TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (travel_application_no) REFERENCES travel_applications(application_no),
      FOREIGN KEY (original_payment_no) REFERENCES payment_flows(payment_no)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_diffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diff_no TEXT UNIQUE NOT NULL,
      diff_date TEXT NOT NULL,
      diff_type TEXT NOT NULL,
      diff_amount REAL NOT NULL,
      related_payment_no TEXT,
      related_refund_no TEXT,
      related_invoice_no TEXT,
      related_application_no TEXT,
      description TEXT,
      reporter TEXT,
      status TEXT DEFAULT 'pending',
      raw_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dirty_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_table TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      source_no TEXT,
      dirty_type TEXT NOT NULL,
      dirty_description TEXT NOT NULL,
      field_name TEXT,
      expected_value TEXT,
      actual_value TEXT,
      raw_data TEXT NOT NULL,
      correction_suggestion TEXT,
      correction_note TEXT,
      is_corrected BOOLEAN DEFAULT 0,
      corrected_by TEXT,
      corrected_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_dirty_records_source ON dirty_records(source_table, source_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dirty_records_type ON dirty_records(dirty_type)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_trails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL,
      operation_module TEXT NOT NULL,
      operation_desc TEXT NOT NULL,
      source_table TEXT,
      source_id INTEGER,
      source_no TEXT,
      request_method TEXT,
      request_url TEXT,
      request_body TEXT,
      response_status INTEGER,
      response_body TEXT,
      operator TEXT,
      operator_ip TEXT,
      before_data TEXT,
      after_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_trails_operation ON audit_trails(operation_type, operation_module)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_trails_created ON audit_trails(created_at)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_no TEXT UNIQUE NOT NULL,
      audit_date TEXT NOT NULL,
      audit_type TEXT NOT NULL,
      total_invoices INTEGER DEFAULT 0,
      total_payments INTEGER DEFAULT 0,
      total_refunds INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      duplicate_invoice_count INTEGER DEFAULT 0,
      duplicate_amount REAL DEFAULT 0,
      dirty_record_count INTEGER DEFAULT 0,
      reconciliation_diff_amount REAL DEFAULT 0,
      result_summary TEXT,
      status TEXT DEFAULT 'completed',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS duplicate_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT UNIQUE NOT NULL,
      group_type TEXT NOT NULL,
      group_desc TEXT,
      duplicate_key TEXT NOT NULL,
      invoice_count INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      involved_applicants TEXT,
      is_resolved BOOLEAN DEFAULT 0,
      resolution_note TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS replay_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      session_name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'running',
      anomaly_count INTEGER DEFAULT 0,
      report_path TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  console.log('数据库表创建完成！');
  
  db.run(`
    INSERT OR IGNORE INTO travel_applications (
      application_no, applicant_id, applicant_name, department,
      travel_start_date, travel_end_date, travel_destination,
      travel_purpose, estimated_accommodation_amount,
      estimated_transportation_amount, estimated_total_amount,
      status, shared_trip_group_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'INIT_SAMPLE_001', 'SYS_INIT', '系统初始化', '技术部',
    '2024-01-01', '2024-01-02', '北京',
    '初始化样本数据', 0, 0, 0,
    'approved', 'INIT_GROUP'
  ], (err) => {
    if (err) {
      console.error('初始化数据失败:', err.message);
    } else {
      console.log('数据库初始化完成！');
    }
    db.close();
  });
});
