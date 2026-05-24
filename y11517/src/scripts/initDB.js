const db = require('../database/db');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('data_entry', 'reviewer', 'supervisor', 'read_only')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      repair_type TEXT NOT NULL,
      site_address TEXT,
      old_caliber TEXT,
      new_caliber TEXT,
      shift_record TEXT,
      status TEXT DEFAULT 'pending',
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS valve_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id TEXT REFERENCES work_orders(id),
      valve_type TEXT NOT NULL,
      caliber TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      is_supplementary INTEGER DEFAULT 0,
      record_type TEXT CHECK(record_type IN ('old', 'new')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id TEXT REFERENCES work_orders(id),
      photo_path TEXT NOT NULL,
      photo_type TEXT,
      uploaded_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id TEXT REFERENCES work_orders(id),
      material_name TEXT NOT NULL,
      original_price DECIMAL(10,2),
      adjusted_price DECIMAL(10,2),
      reason TEXT,
      adjusted_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      work_order_id TEXT REFERENCES work_orders(id),
      item_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'retry', 'dead_letter', 'manual', 'completed', 'closed')),
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 5,
      last_error TEXT,
      error_stack TEXT,
      next_retry_at DATETIME,
      manual_note TEXT,
      handled_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS queue_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_item_id TEXT REFERENCES queue_items(id),
      from_status TEXT,
      to_status TEXT,
      action TEXT NOT NULL,
      note TEXT,
      performed_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compensation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_item_id TEXT REFERENCES queue_items(id),
      work_order_id TEXT REFERENCES work_orders(id),
      material_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2),
      total_amount DECIMAL(10,2),
      compensation_type TEXT,
      is_verified INTEGER DEFAULT 0,
      verified_by INTEGER REFERENCES users(id),
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      changes TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_items(status);
    CREATE INDEX IF NOT EXISTS idx_queue_work_order ON queue_items(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_queue_next_retry ON queue_items(next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_compensation_work_order ON compensation_records(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
  `);

  const userCount = await db.getSync('SELECT COUNT(*) as count FROM users');
  
  if (userCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)
    `);

    await insertUser.run('admin', bcrypt.hashSync('admin123', salt), config.roles.SUPERVISOR);
    await insertUser.run('reviewer1', bcrypt.hashSync('review123', salt), config.roles.REVIEWER);
    await insertUser.run('entry1', bcrypt.hashSync('entry123', salt), config.roles.DATA_ENTRY);
    await insertUser.run('viewer1', bcrypt.hashSync('view123', salt), config.roles.READ_ONLY);

    console.log('默认用户已创建:');
    console.log('  主管: admin / admin123');
    console.log('  复核: reviewer1 / review123');
    console.log('  录入: entry1 / entry123');
    console.log('  只读: viewer1 / view123');
  }

  console.log('数据库初始化完成!');
  process.exit(0);
}

initDatabase().catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
