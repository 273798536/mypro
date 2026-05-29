const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'film_revenue.db');

let db = null;
let SQL = null;
let schemaInitialized = false;

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    film_name TEXT NOT NULL,
    total_budget REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS investment_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    contract_no TEXT UNIQUE,
    total_investment REAL DEFAULT 0,
    contract_date DATE,
    created_by TEXT,
    source_type TEXT DEFAULT 'contract',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS investor_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    investor_id INTEGER NOT NULL,
    investor_name TEXT,
    investment_amount REAL DEFAULT 0,
    share_ratio REAL DEFAULT 0,
    version INTEGER DEFAULT 1,
    parent_id INTEGER,
    changed_by TEXT,
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES investment_contracts(id),
    FOREIGN KEY (investor_id) REFERENCES investors(id),
    FOREIGN KEY (parent_id) REFERENCES investor_shares(id)
  )`,
  `CREATE TABLE IF NOT EXISTS revenue_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    revenue_type TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    expected_date DATE,
    created_by TEXT,
    source_type TEXT DEFAULT 'plan',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS revenue_installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    revenue_plan_id INTEGER NOT NULL,
    installment_no INTEGER,
    amount REAL DEFAULT 0,
    expected_date DATE,
    actual_date DATE,
    actual_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    parent_id INTEGER,
    changed_by TEXT,
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (revenue_plan_id) REFERENCES revenue_plans(id),
    FOREIGN KEY (parent_id) REFERENCES revenue_installments(id)
  )`,
  `CREATE TABLE IF NOT EXISTS cost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    cost_type TEXT,
    amount REAL DEFAULT 0,
    cost_date DATE,
    description TEXT,
    is_deductible INTEGER DEFAULT 1,
    parent_id INTEGER,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (parent_id) REFERENCES cost_items(id)
  )`,
  `CREATE TABLE IF NOT EXISTS data_merges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    source_a_id INTEGER,
    source_b_id INTEGER,
    source_a_type TEXT,
    source_b_type TEXT,
    conflict_fields TEXT,
    resolution TEXT,
    resolved_by TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS sharing_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    revenue_installment_id INTEGER,
    sharing_date DATE,
    total_revenue REAL DEFAULT 0,
    special_fund REAL DEFAULT 0,
    business_tax REAL DEFAULT 0,
    cinema_share REAL DEFAULT 0,
    distribution_fee REAL DEFAULT 0,
    distributable_amount REAL DEFAULT 0,
    cost_deducted REAL DEFAULT 0,
    investor_distributable REAL DEFAULT 0,
    calculation_details TEXT,
    created_by TEXT,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (revenue_installment_id) REFERENCES revenue_installments(id)
  )`,
  `CREATE TABLE IF NOT EXISTS investor_distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sharing_record_id INTEGER NOT NULL,
    investor_id INTEGER NOT NULL,
    investor_name TEXT,
    share_ratio REAL DEFAULT 0,
    distribution_amount REAL DEFAULT 0,
    investor_share_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sharing_record_id) REFERENCES sharing_records(id),
    FOREIGN KEY (investor_id) REFERENCES investors(id),
    FOREIGN KEY (investor_share_id) REFERENCES investor_shares(id)
  )`,
  `CREATE TABLE IF NOT EXISTS version_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)`,
  `CREATE INDEX IF NOT EXISTS idx_contracts_project ON investment_contracts(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shares_contract ON investor_shares(contract_id)`,
  `CREATE INDEX IF NOT EXISTS idx_revenue_project ON revenue_plans(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_installments_plan ON revenue_installments(revenue_plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_costs_project ON cost_items(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sharing_project ON sharing_records(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_distributions_sharing ON investor_distributions(sharing_record_id)`,
  `CREATE INDEX IF NOT EXISTS idx_version_record ON version_history(table_name, record_id)`
];

function initSchema(db) {
  CREATE_TABLES.forEach(sql => db.exec(sql));
  CREATE_INDEXES.forEach(sql => db.exec(sql));
}

async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  const isNewDatabase = !fs.existsSync(dbPath);

  if (isNewDatabase) {
    db = new SQL.Database();
    initSchema(db);
    saveDatabase();
    schemaInitialized = true;
    console.log('数据库初始化完成');
  } else {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  }

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDb() {
  return db;
}

module.exports = {
  initDatabase,
  saveDatabase,
  getDb
};
