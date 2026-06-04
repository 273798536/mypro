const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'uav_review.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS annotation_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_no TEXT NOT NULL,
        image_id TEXT NOT NULL,
        anomaly_type TEXT,
        anomaly_desc TEXT,
        coordinate_x REAL,
        coordinate_y REAL,
        zoom_level REAL,
        pan_offset_x REAL,
        pan_offset_y REAL,
        operator TEXT,
        operate_time TEXT,
        source_file TEXT,
        process_log TEXT,
        import_hash TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(batch_no, image_id, anomaly_type, coordinate_x, coordinate_y)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS review_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        annotation_id INTEGER NOT NULL,
        reviewer TEXT,
        review_result TEXT,
        review_comment TEXT,
        score INTEGER,
        review_time TEXT,
        zoom_verify_passed INTEGER DEFAULT 0,
        pan_verify_passed INTEGER DEFAULT 0,
        traceability_chain TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (annotation_id) REFERENCES annotation_records (id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS import_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_no TEXT NOT NULL UNIQUE,
        import_time TEXT,
        import_count INTEGER,
        operator TEXT,
        source_file TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS process_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        annotation_id INTEGER,
        action TEXT,
        operator TEXT,
        old_value TEXT,
        new_value TEXT,
        operate_time TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (annotation_id) REFERENCES annotation_records (id)
      )
    `);

    console.log('数据表初始化完成');
  });
}

module.exports = db;
