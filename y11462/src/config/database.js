const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功:', dbPath);
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

function initTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS import_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_file TEXT NOT NULL,
          source_type TEXT NOT NULL,
          total_rows INTEGER DEFAULT 0,
          success_rows INTEGER DEFAULT 0,
          failed_rows INTEGER DEFAULT 0,
          imported_by TEXT,
          imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          remark TEXT
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS material_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          queue_no TEXT UNIQUE NOT NULL,
          import_id INTEGER,
          source_file TEXT,
          source_row INTEGER,
          batch_no TEXT NOT NULL,
          material_type TEXT NOT NULL,
          material_name TEXT,
          material_spec TEXT,
          appointment_no TEXT,
          patient_name TEXT,
          invoice_no TEXT,
          approval_email_id TEXT,
          original_data TEXT NOT NULL,
          parsed_data TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING',
          retry_count INTEGER DEFAULT 0,
          max_retry INTEGER DEFAULT 3,
          next_retry_at DATETIME,
          last_error TEXT,
          department TEXT,
          handled_by TEXT,
          handled_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (import_id) REFERENCES import_records(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS status_traces (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          queue_id INTEGER NOT NULL,
          from_status TEXT,
          to_status TEXT NOT NULL,
          action TEXT NOT NULL,
          operator TEXT,
          remark TEXT,
          error_message TEXT,
          trace_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (queue_id) REFERENCES material_queue(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_status ON material_queue(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_batch ON material_queue(batch_no)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_trace_queue ON status_traces(queue_id)`, (err) => {
        if (err) reject(err);
        else {
          console.log('数据库表初始化完成');
          resolve();
        }
      });
    });
  });
}

module.exports = { db, initTables };
