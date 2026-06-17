import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'delivery.db');

function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function getDatabase(): Database.Database {
  ensureDataDir();
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function initDatabase(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_record (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL UNIQUE,
      market_name TEXT NOT NULL,
      market_name_raw TEXT NOT NULL,
      location TEXT NOT NULL,
      location_raw TEXT NOT NULL,
      coordinates_lat REAL NOT NULL,
      coordinates_lng REAL NOT NULL,
      coordinates_raw_lat REAL NOT NULL,
      coordinates_raw_lng REAL NOT NULL,
      delivery_time TEXT,
      delivery_time_raw TEXT,
      truck_number TEXT,
      truck_number_raw TEXT,
      goods_type TEXT,
      goods_type_raw TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL,
      source_file TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_record_status ON delivery_record(status);
    CREATE INDEX IF NOT EXISTS idx_record_source ON delivery_record(source);

    CREATE TABLE IF NOT EXISTS data_issue (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES delivery_record(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_issue_record ON data_issue(record_id);
    CREATE INDEX IF NOT EXISTS idx_issue_type ON data_issue(type);

    CREATE TABLE IF NOT EXISTS history_record (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      operator TEXT NOT NULL,
      operate_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (record_id) REFERENCES delivery_record(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_record ON history_record(record_id);
    CREATE INDEX IF NOT EXISTS idx_history_time ON history_record(operate_time DESC);

    CREATE TABLE IF NOT EXISTS merge_evidence (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      merged_ids TEXT NOT NULL,
      merged_names TEXT NOT NULL,
      operator TEXT NOT NULL,
      operate_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reason TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES delivery_record(id) ON DELETE CASCADE
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM delivery_record').get() as { count: number };
  if (count.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO delivery_record (
        id, record_id, market_name, market_name_raw, location, location_raw,
        coordinates_lat, coordinates_lng, coordinates_raw_lat, coordinates_raw_lng,
        delivery_time, delivery_time_raw, truck_number, truck_number_raw,
        goods_type, goods_type_raw, status, source, source_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleData = [
      ['rec_001', 'X2024001', '东风菜市场', '東風菜市場', '东风路123号', '東風路123號',
       31.2304, 121.4737, 31.2304, 121.4737,
       '2024-06-15 06:00', '6月15日早上6点', '沪A12345', '沪A·12345',
       '蔬菜', '蔬菜类', 'pending', 'excel', '6月会议纪要.xlsx'],
      ['rec_002', 'X2024002', '南山农贸市场', '南山農貿市場', '南山街456号', '南山街456號',
       31.2350, 121.4800, 31.2510, 121.4900,
       '2024-06-15 07:30', '15号7点半', '沪B67890', '沪B67890',
       '水果', '水果', 'pending', 'manual', '手工录入'],
      ['rec_003', 'X2024003', '东风菜市场', '东风菜场', '东风路125号', '東風路125號',
       31.2306, 121.4739, 31.2306, 121.4739,
       '2024-06-15 08:00', '6月15日8点', '沪C11111', '沪C-11111',
       '水产', '海鲜水产', 'pending', 'excel', '6月会议纪要.xlsx'],
      ['rec_004', 'X2024004', '中心菜场', '中心菜市场', '中山大道88号', '中山大道88號',
       31.2280, 121.4700, 31.2280, 121.4700,
       '2024-06-15 05:30', '凌晨5点半', '沪D22222', '沪D22222',
       '肉类', '猪肉牛肉', 'conflict', 'excel', '6月会议纪要.xlsx'],
    ];

    const insertIssue = db.prepare(`
      INSERT INTO data_issue (id, record_id, type, severity, description, suggestion)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const data of sampleData) {
        insertStmt.run(...data);
      }

      insertIssue.run(
        'issue_001', 'rec_002', 'coordinate_offset', 'error',
        '坐标偏移到隔壁街，原始坐标 (31.2510, 121.4900) 与地址南山街456号不匹配',
        '请核对地址对应的正确坐标，建议使用地图工具查询南山街456号的准确经纬度后修正'
      );

      insertIssue.run(
        'issue_002', 'rec_003', 'name_inconsistent', 'warning',
        '与rec_001名称写法不同但疑似同一地点：东风菜市场 vs 东风菜场',
        '请确认是否为同一菜场，如果是请使用地点归并功能合并两条记录'
      );

      insertIssue.run(
        'issue_003', 'rec_004', 'time_conflict', 'warning',
        '卸货时间早于该路段允许卸货时间（6:00开始）',
        '请确认卸货时间是否正确，或申请该时段的特殊卸货许可'
      );
    });

    transaction();
  }

  db.close();
}
