const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../data/seawater.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  saveDatabase();

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_no TEXT NOT NULL UNIQUE,
      sampling_point TEXT,
      sampling_time TEXT,
      temperature REAL,
      ph REAL,
      conductivity REAL,
      manual_remark TEXT,
      status TEXT NOT NULL DEFAULT 'imported',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reagent_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reagent_name TEXT NOT NULL,
      reagent_code TEXT,
      batch_no TEXT,
      concentration REAL,
      unit TEXT,
      purity REAL,
      manufacture_date TEXT,
      expiry_date TEXT,
      supplier TEXT,
      remark TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversion_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      reagent_id INTEGER,
      salinity_result REAL,
      calculation_method TEXT,
      weighing_precision REAL,
      weighing_precision_pass INTEGER DEFAULT 1,
      weighing_precision_detail TEXT,
      reaction_condition TEXT,
      spectrum_data TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sample_id) REFERENCES samples(id),
      FOREIGN KEY (reagent_id) REFERENCES reagent_ledger(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversion_id INTEGER NOT NULL,
      reviewer TEXT,
      review_result TEXT,
      review_opinion TEXT,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversion_id) REFERENCES conversion_records(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      operator TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS safety_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversion_id INTEGER,
      sample_id INTEGER,
      alert_type TEXT NOT NULL,
      alert_level TEXT NOT NULL,
      alert_message TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (conversion_id) REFERENCES conversion_records(id),
      FOREIGN KEY (sample_id) REFERENCES samples(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_conversion_sample ON conversion_records(sample_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_conversion_status ON conversion_records(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_logs_target ON operation_logs(target_type, target_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_active ON safety_alerts(is_active)`);
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, buffer);
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

function runInsert(sql, params = []) {
  db.run(sql, params);
  const result = runQuery('SELECT last_insert_rowid() as id');
  saveDatabase();
  return result[0].id;
}

function runUpdate(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  saveDatabase();
  return changes;
}

module.exports = {
  initDatabase,
  saveDatabase,
  getDb,
  runQuery,
  runInsert,
  runUpdate
};
