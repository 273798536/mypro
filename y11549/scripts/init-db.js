const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const logger = require('../src/config/logger');

const dataDir = path.join(__dirname, '../data');
const logsDir = path.join(__dirname, '../logs');
const uploadsDir = path.join(__dirname, '../uploads');
const exportsDir = path.join(__dirname, '../exports');

[dataDir, logsDir, uploadsDir, exportsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const dbPath = path.join(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

const initSQL = `
  CREATE TABLE IF NOT EXISTS import_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file_name TEXT NOT NULL,
    source_file_hash TEXT NOT NULL,
    record_type TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing',
    error_message TEXT,
    UNIQUE(source_file_hash, record_type)
  );

  CREATE TABLE IF NOT EXISTS material_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    source_row_number INTEGER,
    raw_data TEXT,
    material_code TEXT UNIQUE,
    material_name TEXT NOT NULL,
    category TEXT,
    specifications TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    estimated_value DECIMAL(10,2),
    owner_department TEXT,
    workflow_state TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logistics_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    source_row_number INTEGER,
    raw_data TEXT,
    receipt_no TEXT UNIQUE,
    tracking_number TEXT,
    material_code TEXT,
    material_name TEXT,
    sender_name TEXT,
    sender_phone TEXT,
    receiver_name TEXT,
    receiver_phone TEXT,
    receive_address TEXT,
    receive_date DATE,
    received_quantity INTEGER,
    receiver_signature TEXT,
    workflow_state TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS borrow_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    source_row_number INTEGER,
    raw_data TEXT,
    borrow_no TEXT UNIQUE,
    material_code TEXT,
    material_name TEXT,
    borrower_name TEXT,
    borrower_phone TEXT,
    borrower_department TEXT,
    borrow_date DATETIME,
    expected_return_date DATETIME,
    actual_return_date DATETIME,
    borrow_quantity INTEGER,
    return_quantity INTEGER,
    location TEXT,
    shift_info TEXT,
    status TEXT DEFAULT 'borrowed',
    responsible_person TEXT,
    workflow_state TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shift_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    source_row_number INTEGER,
    raw_data TEXT,
    shift_date DATE,
    shift_type TEXT,
    team_leader TEXT,
    team_member TEXT,
    handover_notes TEXT,
    workflow_state TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS price_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    source_row_number INTEGER,
    raw_data TEXT,
    material_code TEXT UNIQUE,
    original_price DECIMAL(10,2),
    adjusted_price DECIMAL(10,2),
    adjustment_reason TEXT,
    adjusted_by TEXT,
    adjustment_date DATE,
    workflow_state TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_type TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    operator TEXT NOT NULL,
    operator_role TEXT,
    old_workflow_state TEXT,
    new_workflow_state TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS investigation_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    borrow_record_id INTEGER,
    sequence_no INTEGER NOT NULL,
    handler TEXT,
    handler_role TEXT,
    action TEXT,
    decision TEXT,
    evidence TEXT,
    change_reason TEXT,
    is_manual_adjustment BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS export_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT NOT NULL,
    export_type TEXT NOT NULL,
    requested_by TEXT,
    filters TEXT,
    include_sensitive BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'pending',
    frozen_at DATETIME,
    file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );
`;

db.exec(initSQL, (err) => {
  if (err) {
    logger.error('数据库初始化失败', { error: err.message });
    console.error('数据库初始化失败:', err.message);
    process.exit(1);
  } else {
    logger.info('数据库初始化完成');
    console.log('✅ 数据库初始化完成');
    db.close();
  }
});
