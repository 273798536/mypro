const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rent_audit.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      store_code TEXT UNIQUE NOT NULL,
      store_name TEXT NOT NULL,
      mall_name TEXT,
      address TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      contract_no TEXT UNIQUE NOT NULL,
      version INTEGER DEFAULT 1,
      effective_date DATE NOT NULL,
      end_date DATE,
      base_rent REAL,
      rent_type TEXT DEFAULT 'guarantee_plus_commission',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commission_rules (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      category TEXT,
      rate REAL,
      threshold REAL,
      tier_level INTEGER,
      effective_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contract_id) REFERENCES contracts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sales_data (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      sale_date DATE NOT NULL,
      category TEXT,
      gross_amount REAL NOT NULL,
      refund_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      activity_deduction REAL DEFAULT 0,
      source_batch TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT UNIQUE NOT NULL,
      period TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_records INTEGER DEFAULT 0,
      issue_count INTEGER DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_records (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      contract_id TEXT,
      period TEXT NOT NULL,
      base_rent REAL,
      commission_amount REAL,
      total_rent REAL,
      sales_amount REAL,
      refund_adjustment REAL DEFAULT 0,
      activity_adjustment REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      issue_type TEXT,
      issue_description TEXT,
      correction_hint TEXT,
      follow_up_action TEXT,
      trial_calculation JSON,
      previous_record_id TEXT,
      changed_fields JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES audit_batches(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (contract_id) REFERENCES contracts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS import_logs (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      data_type TEXT NOT NULL,
      file_name TEXT,
      total_rows INTEGER DEFAULT 0,
      success_rows INTEGER DEFAULT 0,
      error_rows INTEGER DEFAULT 0,
      errors JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS status_transitions (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      transition_reason TEXT,
      operator TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES audit_records(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_sales_store_date ON sales_data(store_id, sale_date);
    CREATE INDEX IF NOT EXISTS idx_audit_store_period ON audit_records(store_id, period);
    CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_records(status);
  `);

  console.log('数据库表创建完成');
});

db.close();
