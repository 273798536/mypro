import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import type { AnomalyType, RecordStatus, SourceType, MigrationStatus, BackupStatus } from '../../shared/types.js';

const SLOW_QUERY_FILES = [
  'slow_query_20260615.log',
  'slow_query_20260616.log',
  'slow_query_20260617.log',
  'slow_query_20260618.log',
];

const SCHEMA_FILES = [
  'schema_snapshot_20260615.sql',
  'schema_snapshot_20260617.sql',
  'schema_snapshot_20260618.sql',
];

const TABLE_NAMES = [
  'users', 'orders', 'products', 'order_items', 'payments',
  'inventory', 'categories', 'reviews', 'coupons', 'addresses',
];

const SLOW_QUERY_SAMPLES = [
  'SELECT * FROM orders WHERE status = ? AND created_at > ? ORDER BY created_at DESC',
  'SELECT COUNT(*) FROM large_table WHERE category_id = ? GROUP BY region',
  'SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count FROM users u',
  'SELECT * FROM products p JOIN inventory i ON p.id = i.product_id WHERE i.quantity < ?',
  'SELECT o.*, oi.* FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = ?',
  'SELECT DISTINCT category_id FROM products WHERE price > ? AND created_at < ?',
  'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT ?, ?',
  'UPDATE orders SET status = ? WHERE id IN (SELECT order_id FROM payments WHERE status = ?)',
];

const SCHEMA_SAMPLES = [
  `CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0 AFTER total_amount;`,

  `CREATE TABLE inventory (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_warehouse (product_id, warehouse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `ALTER TABLE products DROP COLUMN old_feature_flag;`,

  `ALTER TABLE order_items MODIFY COLUMN unit_price DECIMAL(12,2) NOT NULL;`,

  `CREATE TABLE coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type ENUM('PERCENTAGE','FIXED') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  usage_limit INT DEFAULT 1,
  used_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
];

const ANOMALY_DISTRIBUTION: AnomalyType[] = [
  'SLOW_QUERY_CONFLICT', 'SLOW_QUERY_CONFLICT', 'SLOW_QUERY_CONFLICT',
  'SCHEMA_CONFLICT', 'SCHEMA_CONFLICT', 'SCHEMA_CONFLICT',
  'BACKUP_GAP', 'BACKUP_GAP',
  'DUPLICATE_IMPORT',
  'NONE', 'NONE',
];

const STATUS_MAP: Record<AnomalyType, RecordStatus> = {
  SLOW_QUERY_CONFLICT: 'NEEDS_REVIEW',
  SCHEMA_CONFLICT: 'NEEDS_REVIEW',
  BACKUP_GAP: 'UNAVAILABLE',
  DUPLICATE_IMPORT: 'UNAVAILABLE',
  NONE: 'AVAILABLE',
};

const CONFLICT_DETAILS: Record<AnomalyType, string[]> = {
  SLOW_QUERY_CONFLICT: [
    '慢查询执行计划显示使用了filesort，与快照中的索引设计冲突',
    '查询涉及的表在快照后有结构变更，可能影响性能',
    'SQL模式变更导致查询执行计划改变，需DBA复核',
    '关联查询的表在不同快照中有不同的索引配置',
  ],
  SCHEMA_CONFLICT: [
    '表结构变更删除了慢查询依赖的字段，导致历史查询失效',
    '字段类型变更可能导致隐式类型转换，影响查询性能',
    '索引变更与慢查询优化方案冲突，需重新评估',
    '表结构调整后，原有分区策略不再适用',
  ],
  BACKUP_GAP: [
    '备份校验发现该时间段缺失127条记录，数据不完整',
    '增量备份断点，该时段数据不可恢复，标记为不可用',
    '校验和不匹配，备份文件可能损坏，建议忽略该批次',
    '跨表关联查询时发现数据缺口，相关记录不可信',
  ],
  DUPLICATE_IMPORT: [
    '检测到与批次batch_001中的记录重复，已自动跳过',
    '记录编号冲突，该内容已存在于系统中',
    '相同来源文件第156行已导入，避免重复入账',
  ],
  NONE: [''],
};

export function seedDatabase(): void {
  const db = getDb();

  const countResult = db.prepare('SELECT COUNT(*) as count FROM ledger_records').get() as { count: number };
  if (countResult.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database with mock data...');

  const batches = [
    { id: 'batch_001', file: SLOW_QUERY_FILES[0], type: 'SLOW_QUERY_LOG' as SourceType, count: 18 },
    { id: 'batch_002', file: SCHEMA_FILES[0], type: 'SCHEMA_SNAPSHOT' as SourceType, count: 12 },
    { id: 'batch_003', file: SLOW_QUERY_FILES[1], type: 'SLOW_QUERY_LOG' as SourceType, count: 20 },
  ];

  const insertBatch = db.prepare(`
    INSERT INTO import_batches (id, file_name, source_type, total_records, new_records, duplicate_records, anomaly_count, imported_at, imported_by)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'dba_admin')
  `);

  const insertRecord = db.prepare(`
    INSERT INTO ledger_records (
      id, record_no, anomaly_type, status, source_file, original_line_no,
      source_type, import_batch_id, slow_query_sql, schema_snapshot,
      conflict_details, handling_opinion, business_notes, source_remark,
      image_name, created_at, updated_at, handled_by, handled_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let recordCounter = 1;
  const now = new Date();

  batches.forEach((batch, batchIdx) => {
    const batchRecords: any[] = [];
    let anomalyCount = 0;

    for (let i = 0; i < batch.count; i++) {
      const anomalyIdx = Math.floor(Math.random() * ANOMALY_DISTRIBUTION.length);
      const anomalyType = ANOMALY_DISTRIBUTION[anomalyIdx];
      const status = STATUS_MAP[anomalyType];
      const detailIdx = Math.floor(Math.random() * CONFLICT_DETAILS[anomalyType].length);
      const conflictDetail = CONFLICT_DETAILS[anomalyType][detailIdx];

      if (anomalyType !== 'NONE') anomalyCount++;

      const createdAt = new Date(now.getTime() - (batches.length - batchIdx) * 86400000 - i * 300000);
      const handledAt = status !== 'NEEDS_REVIEW' ? new Date(createdAt.getTime() + 3600000) : null;

      const record: any = {
        id: `rec_${String(recordCounter).padStart(3, '0')}`,
        recordNo: `LED-2026-${String(recordCounter).padStart(5, '0')}`,
        anomalyType,
        status,
        sourceFile: batch.file,
        originalLineNo: i + 1,
        sourceType: batch.type,
        importBatchId: batch.id,
        slowQuerySql: batch.type === 'SLOW_QUERY_LOG' ? SLOW_QUERY_SAMPLES[i % SLOW_QUERY_SAMPLES.length] : null,
        schemaSnapshot: batch.type === 'SCHEMA_SNAPSHOT' ? SCHEMA_SAMPLES[i % SCHEMA_SAMPLES.length] : null,
        conflictDetails: conflictDetail || null,
        handlingOpinion: anomalyType !== 'NONE' ? '请DBA复核异常详情，确认处理方案后更新状态' : null,
        businessNotes: null,
        sourceRemark: `原始行号: ${i + 1}, 来源文件: ${batch.file}`,
        imageName: batch.type === 'SCHEMA_SNAPSHOT' ? `schema_${batch.id}_${i + 1}.png` : null,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        handledBy: status !== 'NEEDS_REVIEW' ? (status === 'AVAILABLE' ? 'system_auto' : 'dba_zhang') : null,
        handledAt: handledAt ? handledAt.toISOString() : null,
      };

      batchRecords.push(record);
      recordCounter++;
    }

    insertBatch.run(
      batch.id, batch.file, batch.type, batch.count,
      batchRecords.filter(r => r.anomalyType !== 'DUPLICATE_IMPORT').length,
      anomalyCount,
      new Date(now.getTime() - (batches.length - batchIdx) * 86400000).toISOString()
    );

    batchRecords.forEach(r => {
      insertRecord.run(
        r.id, r.recordNo, r.anomalyType, r.status, r.sourceFile, r.originalLineNo,
        r.sourceType, r.importBatchId, r.slowQuerySql, r.schemaSnapshot,
        r.conflictDetails, r.handlingOpinion, r.businessNotes, r.sourceRemark,
        r.imageName, r.createdAt, r.updatedAt, r.handledBy, r.handledAt
      );
    });
  });

  const insertMigration = db.prepare(`
    INSERT INTO migration_tasks (id, table_name, status, total_records, processed_records, failed_records, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const migrationStatuses: MigrationStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'PENDING', 'FAILED', 'COMPLETED'];

  TABLE_NAMES.forEach((table, idx) => {
    const status = migrationStatuses[idx] || 'PENDING';
    const total = Math.floor(Math.random() * 100000) + 50000;
    const processed = status === 'COMPLETED' ? total : (status === 'IN_PROGRESS' ? Math.floor(total * 0.65) : (status === 'FAILED' ? Math.floor(total * 0.4) : 0));
    const failed = status === 'FAILED' ? Math.floor(total * 0.02) : 0;
    const startedAt = status !== 'PENDING' ? new Date(now.getTime() - 86400000).toISOString() : null;
    const completedAt = status === 'COMPLETED' ? new Date(now.getTime() - 3600000).toISOString() : null;

    insertMigration.run(
      `mig_${String(idx + 1).padStart(3, '0')}`,
      table, status, total, processed, failed, startedAt, completedAt
    );
  });

  const insertBackup = db.prepare(`
    INSERT INTO backup_checks (id, table_name, backup_date, status, expected_records, actual_records, gap_records, checksum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const backupDate = new Date(now.getTime() - dayOffset * 86400000).toISOString().split('T')[0];
    
    TABLE_NAMES.slice(0, 7).forEach((table, tableIdx) => {
      const isGap = dayOffset === 3 && (tableIdx === 2 || tableIdx === 5);
      const isCorrupted = dayOffset === 5 && tableIdx === 0;
      const expected = Math.floor(Math.random() * 50000) + 10000;
      const actual = isGap ? expected - Math.floor(Math.random() * 500) - 100 : (isCorrupted ? Math.floor(expected * 0.9) : expected);
      const status: BackupStatus = isGap ? 'MISSING' : (isCorrupted ? 'CORRUPTED' : 'VERIFIED');
      const gapRecords = Math.max(0, expected - actual);

      insertBackup.run(
        `bak_${dayOffset}_${tableIdx}`,
        table, backupDate, status, expected, actual, gapRecords,
        status === 'VERIFIED' ? `sha256:${Math.random().toString(16).slice(2, 34)}` : null
      );
    });
  }

  console.log('Database seeding completed!');
  console.log(`  - Import batches: ${batches.length}`);
  console.log(`  - Ledger records: ${recordCounter - 1}`);
  console.log(`  - Migration tasks: ${TABLE_NAMES.length}`);
  console.log(`  - Backup checks: ${7 * 7}`);
}
