const { execAsync, runAsync } = require('../src/config/database');

const createTables = async () => {
  console.log('开始创建数据库表...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS waves (
      id TEXT PRIMARY KEY,
      wave_no TEXT UNIQUE NOT NULL,
      warehouse_code TEXT NOT NULL,
      zone_code TEXT NOT NULL,
      team_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      total_sku_count INTEGER NOT NULL DEFAULT 0,
      total_qty INTEGER NOT NULL DEFAULT 0,
      picked_qty INTEGER NOT NULL DEFAULT 0,
      shortage_qty INTEGER NOT NULL DEFAULT 0,
      replenished_qty INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS wave_items (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      sku_name TEXT,
      location_code TEXT NOT NULL,
      plan_qty INTEGER NOT NULL,
      picked_qty INTEGER NOT NULL DEFAULT 0,
      shortage_qty INTEGER NOT NULL DEFAULT 0,
      replenished_qty INTEGER NOT NULL DEFAULT 0,
      shortage_reason TEXT,
      is_replenished INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS picking_records (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      wave_item_id TEXT NOT NULL,
      picker_code TEXT NOT NULL,
      location_code TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      plan_qty INTEGER NOT NULL,
      actual_qty INTEGER NOT NULL,
      diff_qty INTEGER NOT NULL DEFAULT 0,
      diff_type TEXT,
      picked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE CASCADE,
      FOREIGN KEY (wave_item_id) REFERENCES wave_items(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS review_scans (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      wave_item_id TEXT NOT NULL,
      reviewer_code TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      scan_qty INTEGER NOT NULL,
      shortage_qty INTEGER NOT NULL DEFAULT 0,
      is_shortage INTEGER DEFAULT 0,
      shortage_reason TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE CASCADE,
      FOREIGN KEY (wave_item_id) REFERENCES wave_items(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS replenishment_tasks (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      wave_item_id TEXT NOT NULL,
      task_no TEXT UNIQUE NOT NULL,
      sku_code TEXT NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      shortage_qty INTEGER NOT NULL,
      replenish_qty INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      picker_code TEXT,
      confirmed_by TEXT,
      confirmed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE CASCADE,
      FOREIGN KEY (wave_item_id) REFERENCES wave_items(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS location_occupations (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      wave_item_id TEXT,
      replenishment_task_id TEXT,
      location_code TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      occupied_qty INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'OCCUPIED',
      occupied_by TEXT,
      occupied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      released_at DATETIME,
      released_by TEXT,
      FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS performance_records (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      wave_item_id TEXT,
      replenishment_task_id TEXT,
      team_code TEXT NOT NULL,
      user_code TEXT NOT NULL,
      performance_type TEXT NOT NULL,
      sku_code TEXT,
      qty INTEGER NOT NULL,
      is_valid INTEGER DEFAULT 1,
      invalid_reason TEXT,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      recalculated_at DATETIME,
      FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS operation_history (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      operator TEXT NOT NULL,
      before_status TEXT,
      after_status TEXT,
      change_content TEXT,
      idempotent_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY,
      wave_id TEXT NOT NULL,
      wave_item_id TEXT,
      performance_record_id TEXT,
      appellant TEXT NOT NULL,
      appeal_reason TEXT NOT NULL,
      appeal_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reviewer TEXT,
      review_result TEXT,
      review_comment TEXT,
      reviewed_at DATETIME
    )`,

    `CREATE INDEX IF NOT EXISTS idx_waves_wave_no ON waves(wave_no)`,
    `CREATE INDEX IF NOT EXISTS idx_waves_status ON waves(status)`,
    `CREATE INDEX IF NOT EXISTS idx_wave_items_wave_id ON wave_items(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_picking_records_wave_id ON picking_records(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_review_scans_wave_id ON review_scans(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_replenishment_tasks_wave_id ON replenishment_tasks(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_replenishment_tasks_status ON replenishment_tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_location_occupations_wave_id ON location_occupations(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_location_occupations_status ON location_occupations(status)`,
    `CREATE INDEX IF NOT EXISTS idx_performance_records_wave_id ON performance_records(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_operation_history_wave_id ON operation_history(wave_id)`,
    `CREATE INDEX IF NOT EXISTS idx_operation_history_idempotent ON operation_history(idempotent_key)`,
    `CREATE INDEX IF NOT EXISTS idx_appeals_wave_id ON appeals(wave_id)`
  ];

  for (const sql of tables) {
    await runAsync(sql);
  }

  console.log('数据库表创建完成！');
};

const main = async () => {
  try {
    await createTables();
    process.exit(0);
  } catch (err) {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  }
};

main();
