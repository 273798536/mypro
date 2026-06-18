import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'audit.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    initTables(dbInstance);
    seedData(dbInstance);
  }
  return dbInstance;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_round (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      archived_at INTEGER,
      operator TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_record (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      field_name TEXT NOT NULL,
      backup_type TEXT NOT NULL,
      report_type TEXT NOT NULL,
      backup_size INTEGER NOT NULL,
      report_size INTEGER NOT NULL,
      has_type_drift INTEGER NOT NULL DEFAULT 0,
      has_size_mismatch INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (round_id) REFERENCES audit_round(id)
    );

    CREATE TABLE IF NOT EXISTS anomaly (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      record_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT NOT NULL,
      suggested_action TEXT NOT NULL,
      interception_rule TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (round_id) REFERENCES audit_round(id),
      FOREIGN KEY (record_id) REFERENCES backup_record(id)
    );

    CREATE TABLE IF NOT EXISTS index_suggestion (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      suggested_index TEXT NOT NULL,
      reason TEXT NOT NULL,
      expected_benefit TEXT NOT NULL,
      priority TEXT NOT NULL,
      related_work_order TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      attribution_updated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (round_id) REFERENCES audit_round(id)
    );

    CREATE TABLE IF NOT EXISTS status_log (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      operator TEXT NOT NULL,
      remark TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (round_id) REFERENCES audit_round(id)
    );

    CREATE INDEX IF NOT EXISTS idx_backup_record_round ON backup_record(round_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_round ON anomaly(round_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_record ON anomaly(record_id);
    CREATE INDEX IF NOT EXISTS idx_index_suggestion_round ON index_suggestion(round_id);
    CREATE INDEX IF NOT EXISTS idx_status_log_round ON status_log(round_id);
    CREATE INDEX IF NOT EXISTS idx_status_log_entity ON status_log(entity_type, entity_id);
  `);
}

function seedData(db: Database.Database): void {
  const roundCount = db.prepare('SELECT COUNT(*) as c FROM audit_round').get() as { c: number };
  if (roundCount.c > 0) return;

  const now = Date.now();
  const roundId = 'round-' + now;
  const operator = '审计员-李明';

  const insertRound = db.prepare(`
    INSERT INTO audit_round (id, name, status, started_at, operator)
    VALUES (?, ?, 'active', ?, ?)
  `);
  insertRound.run(roundId, '2026年Q2审计轮次', now, operator);

  const mockRecords = [
    {
      table: 'user_order',
      field: 'order_id',
      backupType: 'BIGINT',
      reportType: 'INT',
      backupSize: 102400,
      reportSize: 51200,
      hasTypeDrift: true,
      hasSizeMismatch: true,
    },
    {
      table: 'user_order',
      field: 'amount',
      backupType: 'DECIMAL(18,4)',
      reportType: 'DECIMAL(10,2)',
      backupSize: 20480,
      reportSize: 10240,
      hasTypeDrift: true,
      hasSizeMismatch: true,
    },
    {
      table: 'product',
      field: 'product_id',
      backupType: 'VARCHAR(64)',
      reportType: 'VARCHAR(64)',
      backupSize: 65536,
      reportSize: 65536,
      hasTypeDrift: false,
      hasSizeMismatch: false,
    },
    {
      table: 'product',
      field: 'description',
      backupType: 'TEXT',
      reportType: 'VARCHAR(255)',
      backupSize: 524288,
      reportSize: 131072,
      hasTypeDrift: true,
      hasSizeMismatch: true,
    },
    {
      table: 'audit_log',
      field: 'log_id',
      backupType: 'BIGINT',
      reportType: 'BIGINT',
      backupSize: 4194304,
      reportSize: 4194304,
      hasTypeDrift: false,
      hasSizeMismatch: false,
    },
    {
      table: 'audit_log',
      field: 'user_id',
      backupType: 'BIGINT',
      reportType: 'INT',
      backupSize: 512000,
      reportSize: 256000,
      hasTypeDrift: true,
      hasSizeMismatch: true,
    },
    {
      table: 'payment',
      field: 'pay_id',
      backupType: 'VARCHAR(32)',
      reportType: 'VARCHAR(32)',
      backupSize: 262144,
      reportSize: 262144,
      hasTypeDrift: false,
      hasSizeMismatch: false,
    },
    {
      table: 'payment',
      field: 'extra',
      backupType: 'JSON',
      reportType: 'TEXT',
      backupSize: 1048576,
      reportSize: 524288,
      hasTypeDrift: true,
      hasSizeMismatch: true,
    },
  ];

  const insertRecord = db.prepare(`
    INSERT INTO backup_record
    (id, round_id, table_name, field_name, backup_type, report_type,
     backup_size, report_size, has_type_drift, has_size_mismatch, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  const insertAnomaly = db.prepare(`
    INSERT INTO anomaly
    (id, round_id, record_id, type, description, evidence, suggested_action, interception_rule, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  mockRecords.forEach((r, idx) => {
    const recordId = 'rec-' + roundId + '-' + idx;
    insertRecord.run(
      recordId,
      roundId,
      r.table,
      r.field,
      r.backupType,
      r.reportType,
      r.backupSize,
      r.reportSize,
      r.hasTypeDrift ? 1 : 0,
      r.hasSizeMismatch ? 1 : 0,
      now,
      now,
    );

    if (r.hasTypeDrift) {
      const anomalyId = 'anom-' + roundId + '-td-' + idx;
      insertAnomaly.run(
        anomalyId,
        roundId,
        recordId,
        'type_drift',
        `字段 ${r.table}.${r.field} 类型漂移：备份为 ${r.backupType}，报表统计为 ${r.reportType}`,
        `备份文件 field_schema.json 定义为 ${r.backupType}；指标报表 meta_data 记录为 ${r.reportType}`,
        'supply_material',
        '规则 #AUD-203：字段类型精度缩窄将导致数据截断，审计合规要求备份与报表口径完全一致',
        now,
        now,
      );
    }

    if (r.hasSizeMismatch && !r.hasTypeDrift) {
      const anomalyId = 'anom-' + roundId + '-mm-' + idx;
      insertAnomaly.run(
        anomalyId,
        roundId,
        recordId,
        'data_mismatch',
        `字段 ${r.table}.${r.field} 容量数据不一致：备份 ${r.backupSize} 字节，报表 ${r.reportSize} 字节`,
        `备份容量统计脚本结果：${r.backupSize}；指标报表 DB_CAPACITY 表：${r.reportSize}`,
        'adjust_caliber',
        undefined,
        now,
        now,
      );
    }
  });

  const slowAnomalyId = 'anom-' + roundId + '-sq-0';
  insertAnomaly.run(
    slowAnomalyId,
    roundId,
    'rec-' + roundId + '-4',
    'slow_query',
    'audit_log 表存在慢查询，无索引支撑用户维度筛选',
    '慢查询日志：SELECT * FROM audit_log WHERE user_id=? 耗时 2.3s，扫描全表 480 万行',
    'supply_material',
    undefined,
    now,
    now,
  );

  const insertSuggestion = db.prepare(`
    INSERT INTO index_suggestion
    (id, round_id, table_name, suggested_index, reason, expected_benefit, priority, related_work_order, is_active, attribution_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertSuggestion.run(
    'idx-sug-1',
    roundId,
    'audit_log',
    'CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC)',
    '当前按 user_id 过滤走全表扫描，匹配行数超过 480 万',
    '预期查询耗时从 2300ms 降至 15ms 以内，减少 99% IO',
    'high',
    undefined,
    now,
    now,
  );

  insertSuggestion.run(
    'idx-sug-2',
    roundId,
    'user_order',
    'CREATE INDEX idx_order_amount_status ON user_order(status, amount DESC)',
    '高频报表查询按状态+金额排序，存在 filesort',
    '消除 filesort，报表生成从 800ms 降至 50ms',
    'medium',
    'WO-2026-0192',
    now,
    now,
  );

  insertSuggestion.run(
    'idx-sug-3',
    roundId,
    'payment',
    'CREATE INDEX idx_pay_created ON payment(created_at, status)',
    '对账单查询按时间范围过滤，缺少覆盖索引',
    '对账查询从 1.2s 降至 80ms',
    'low',
    undefined,
    now,
    now,
  );

  const insertLog = db.prepare(`
    INSERT INTO status_log
    (id, round_id, entity_type, entity_id, from_status, to_status, operator, remark, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertLog.run(
    'log-init-' + now,
    roundId,
    'record',
    'system',
    'pending',
    'pending',
    operator,
    '系统初始化审计轮次，导入 8 条备份记录，识别 6 条异常',
    now,
  );
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
