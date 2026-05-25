const db = require('../database/db');

async function upgradeDatabase() {
  console.log('开始升级数据库...');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valve_type TEXT NOT NULL,
      caliber TEXT NOT NULL,
      total_quantity INTEGER DEFAULT 0,
      used_quantity INTEGER DEFAULT 0,
      current_stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT '个',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(valve_type, caliber)
    );

    CREATE TABLE IF NOT EXISTS idempotent_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotent_key TEXT UNIQUE NOT NULL,
      queue_item_id TEXT REFERENCES queue_items(id),
      work_order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compensation_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_item_id TEXT REFERENCES queue_items(id),
      original_payload TEXT,
      corrected_payload TEXT,
      correction_note TEXT,
      corrected_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ 新增表创建完成');

  const inventoryCount = await db.getSync('SELECT COUNT(*) as count FROM inventory_summary');
  if (inventoryCount.count === 0) {
    await db.runSync(`
      INSERT INTO inventory_summary (valve_type, caliber, total_quantity, used_quantity, current_stock)
      VALUES 
        ('闸阀', 'DN100', 50, 0, 50),
        ('闸阀', 'DN150', 30, 0, 30),
        ('闸阀', 'DN200', 20, 0, 20),
        ('蝶阀', 'DN100', 40, 0, 40),
        ('蝶阀', 'DN150', 25, 0, 25),
        ('球阀', 'DN50', 100, 0, 100),
        ('球阀', 'DN80', 60, 0, 60)
    `);
    console.log('✅ 初始库存数据已添加');
  }

  console.log('数据库升级完成!');
  process.exit(0);
}

upgradeDatabase().catch(err => {
  console.error('数据库升级失败:', err);
  process.exit(1);
});
