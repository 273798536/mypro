const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = require('../config/database');

const initTables = async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS implants (
      id TEXT PRIMARY KEY,
      batch_number TEXT NOT NULL UNIQUE,
      product_name TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      specification TEXT,
      production_date TEXT,
      expiration_date TEXT,
      initial_stock INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      appointment_no TEXT NOT NULL UNIQUE,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT,
      doctor_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      department TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      treatment_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id TEXT PRIMARY KEY,
      invoice_no TEXT NOT NULL UNIQUE,
      supplier_name TEXT NOT NULL,
      supplier_tax_id TEXT,
      invoice_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      received_date TEXT,
      warehouse_person TEXT,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      implant_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      batch_number TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES supplier_invoices(id),
      FOREIGN KEY (implant_id) REFERENCES implants(id)
    );

    CREATE TABLE IF NOT EXISTS traceability_ledgers (
      id TEXT PRIMARY KEY,
      ledger_no TEXT NOT NULL UNIQUE,
      implant_id TEXT NOT NULL,
      implant_batch_number TEXT NOT NULL,
      appointment_id TEXT,
      appointment_no TEXT,
      invoice_id TEXT,
      invoice_no TEXT,
      patient_name TEXT,
      doctor_name TEXT,
      department TEXT,
      usage_date TEXT,
      usage_quantity INTEGER NOT NULL DEFAULT 0,
      stock_after INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      supervisor_comment TEXT,
      change_reason TEXT,
      sensitive_fields_masked INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      confirmed_at TEXT,
      confirmed_by TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (implant_id) REFERENCES implants(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (invoice_id) REFERENCES supplier_invoices(id)
    );

    CREATE TABLE IF NOT EXISTS failed_records (
      id TEXT PRIMARY KEY,
      record_type TEXT NOT NULL,
      record_data TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_code TEXT,
      failed_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_retry_at TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_at TEXT,
      resolved_by TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      ledger_id TEXT,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_fields TEXT,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      operator_role TEXT NOT NULL,
      operation_time TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      remark TEXT
    );

    CREATE TABLE IF NOT EXISTS director_views (
      id TEXT PRIMARY KEY,
      view_date TEXT NOT NULL UNIQUE,
      total_ledgers INTEGER NOT NULL DEFAULT 0,
      pending_approval INTEGER NOT NULL DEFAULT 0,
      rejected_count INTEGER NOT NULL DEFAULT 0,
      confirmed_count INTEGER NOT NULL DEFAULT 0,
      total_implants_used INTEGER NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      role_distribution TEXT,
      change_reason_stats TEXT,
      generated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_implants_batch ON implants(batch_number);
    CREATE INDEX IF NOT EXISTS idx_appointments_no ON appointments(appointment_no);
    CREATE INDEX IF NOT EXISTS idx_invoices_no ON supplier_invoices(invoice_no);
    CREATE INDEX IF NOT EXISTS idx_ledgers_status ON traceability_ledgers(status);
    CREATE INDEX IF NOT EXISTS idx_ledgers_implant ON traceability_ledgers(implant_id);
    CREATE INDEX IF NOT EXISTS idx_ledgers_appointment ON traceability_ledgers(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_ledgers_date ON traceability_ledgers(usage_date);
    CREATE INDEX IF NOT EXISTS idx_audit_ledger ON audit_logs(ledger_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(operation_time);
    CREATE INDEX IF NOT EXISTS idx_failed_type ON failed_records(record_type);
  `);

  console.log('数据库表初始化完成');
};

module.exports = initTables();
