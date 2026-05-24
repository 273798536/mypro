const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/conference-compensation.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('entry', 'review', 'supervisor', 'readonly')),
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_key TEXT UNIQUE NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('calendar', 'access_card', 'cancel_message', 'supplement')),
      event_type TEXT NOT NULL CHECK(event_type IN ('booking', 'checkin', 'cancel', 'noshow', 'compensation')),
      room_id TEXT NOT NULL,
      room_name TEXT,
      booking_id TEXT,
      booked_by TEXT,
      booked_at DATETIME,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      checkin_time DATETIME,
      cancel_time DATETIME,
      has_tea_service INTEGER DEFAULT 0,
      has_equipment INTEGER DEFAULT 0,
      tea_cost REAL DEFAULT 0,
      equipment_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'retrying', 'reviewing', 'compensated', 'closed', 'dead_letter')),
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      next_retry_at DATETIME,
      last_error TEXT,
      data_version TEXT DEFAULT 'v1',
      source_file TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compensation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      event_key TEXT NOT NULL,
      compensation_type TEXT NOT NULL CHECK(compensation_type IN ('tea', 'equipment', 'manual')),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'CNY',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      review_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'posted')),
      posted_at DATETIME,
      posted_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id),
      FOREIGN KEY (posted_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS failed_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      event_key TEXT,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_stack TEXT,
      raw_payload TEXT,
      source_type TEXT,
      failed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved INTEGER DEFAULT 0,
      resolved_at DATETIME,
      resolved_notes TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS retry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      retry_attempt INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
      error_message TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      executed_by INTEGER,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (executed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS event_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      event_key TEXT NOT NULL,
      field_changed TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      change_reason TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_event_key ON events(event_key);
    CREATE INDEX IF NOT EXISTS idx_events_source_type ON events(source_type);
    CREATE INDEX IF NOT EXISTS idx_events_next_retry ON events(next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_failed_events_resolved ON failed_events(resolved);
    CREATE INDEX IF NOT EXISTS idx_compensation_status ON compensation_records(status);
  `);

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, role, name) VALUES (?, ?, ?)
    `);
    insertUser.run('admin_entry', 'entry', '录入员小王');
    insertUser.run('admin_review', 'review', '复核员小李');
    insertUser.run('admin_super', 'supervisor', '主管张经理');
    insertUser.run('admin_readonly', 'readonly', '只读用户');
  }
}

initDatabase();

module.exports = db;
