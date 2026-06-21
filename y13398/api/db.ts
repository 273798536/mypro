import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'dashboard.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables(db)

  const count = db.prepare('SELECT COUNT(*) AS cnt FROM records').get() as { cnt: number }
  if (count.cnt === 0) {
    seedData(db)
  }

  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      version TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      record_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      original_value TEXT,
      current_value TEXT NOT NULL,
      change_type TEXT NOT NULL CHECK(change_type IN ('sample','threshold','manual','metric')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('processed','pending','anomalous')),
      is_contaminated INTEGER NOT NULL DEFAULT 0,
      contamination_note TEXT,
      next_steps TEXT,
      raw_log_ref TEXT,
      version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (version) REFERENCES versions(version)
    );

    CREATE TABLE IF NOT EXISTS status_log (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      operated_by TEXT NOT NULL DEFAULT 'system',
      operated_at TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES records(id)
    );
  `)
}

function seedData(db: Database.Database): void {
  const insertVersion = db.prepare(
    'INSERT INTO versions (version, label, created_at, record_count) VALUES (?, ?, ?, ?)'
  )
  const insertRecord = db.prepare(
    `INSERT INTO records (id, source, original_value, current_value, change_type, status, is_contaminated, contamination_note, next_steps, raw_log_ref, version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const seed = db.transaction(() => {
    insertVersion.run('v1', '2026-06-14 基线版本', '2026-06-14T10:00:00Z', 8)
    insertVersion.run('v2', '2026-06-21 当前版本', '2026-06-21T10:00:00Z', 10)

    const records: Array<{
      id: string; source: string; original_value: string | null; current_value: string;
      change_type: string; status: string; is_contaminated: number;
      contamination_note: string | null; next_steps: string | null;
      raw_log_ref: string | null; version: string; created_at: string
    }> = [
      { id: 'r001', source: '训练日志 #2847', original_value: '0.032', current_value: '0.032', change_type: 'sample', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2847.json:L142', version: 'v1', created_at: '2026-06-14T10:00:00Z' },
      { id: 'r002', source: '训练日志 #2847', original_value: '0.05', current_value: '0.05', change_type: 'threshold', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2847.json:L198', version: 'v1', created_at: '2026-06-14T10:05:00Z' },
      { id: 'r003', source: '人工修正 #019', original_value: '0.041', current_value: '0.038', change_type: 'manual', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'manual_correction_019.json', version: 'v1', created_at: '2026-06-14T10:10:00Z' },
      { id: 'r004', source: '指标采集 #2847', original_value: '0.037', current_value: '0.037', change_type: 'metric', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'metric_2847.json:L12', version: 'v1', created_at: '2026-06-14T10:15:00Z' },
      { id: 'r005', source: '训练日志 #2901', original_value: '0.029', current_value: '0.029', change_type: 'sample', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2901.json:L88', version: 'v1', created_at: '2026-06-14T10:20:00Z' },
      { id: 'r006', source: '训练日志 #2901', original_value: '0.055', current_value: '0.055', change_type: 'threshold', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2901.json:L201', version: 'v1', created_at: '2026-06-14T10:25:00Z' },
      { id: 'r007', source: '指标采集 #2901', original_value: '0.034', current_value: '0.034', change_type: 'metric', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'metric_2901.json:L15', version: 'v1', created_at: '2026-06-14T10:30:00Z' },
      { id: 'r008', source: '训练日志 #2901', original_value: '0.031', current_value: '0.031', change_type: 'sample', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2901.json:L145', version: 'v1', created_at: '2026-06-14T10:35:00Z' },
      { id: 'r009', source: '训练日志 #2956', original_value: '0.044', current_value: '0.044', change_type: 'sample', status: 'pending', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2956.json:L77', version: 'v2', created_at: '2026-06-21T10:00:00Z' },
      { id: 'r010', source: '训练日志 #2956', original_value: '0.048', current_value: '0.048', change_type: 'threshold', status: 'pending', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2956.json:L203', version: 'v2', created_at: '2026-06-21T10:05:00Z' },
      { id: 'r011', source: '人工改判 #033', original_value: '0.067', current_value: '0.042', change_type: 'manual', status: 'anomalous', is_contaminated: 0, contamination_note: '原始值0.067疑似日志截断导致偏高，人工改判为0.042', next_steps: '["1. 核实训练日志 #2956 完整性","2. 确认截断位置与改判依据","3. 补充改判截图到证据库"]', raw_log_ref: 'manual_correction_033.json', version: 'v2', created_at: '2026-06-21T10:10:00Z' },
      { id: 'r012', source: '指标采集 #2956', original_value: '0.039', current_value: '0.039', change_type: 'metric', status: 'pending', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'metric_2956.json:L9', version: 'v2', created_at: '2026-06-21T10:15:00Z' },
      { id: 'r013', source: '训练日志 #2956', original_value: '0.051', current_value: '0.051', change_type: 'sample', status: 'anomalous', is_contaminated: 1, contamination_note: '验证集污染：训练日志 #2956 的采样数据包含验证集样本ID [V-0042, V-0087, V-0156]', next_steps: '["1. 从训练集移除样本ID: V-0042, V-0087, V-0156","2. 重新运行训练日志 #2956 对应的训练任务","3. 更新数据清洗管道，添加验证集ID校验规则","4. 在此条目标记处理完成后上传清洗日志"]', raw_log_ref: 'train_log_2956.json:L312', version: 'v2', created_at: '2026-06-21T10:20:00Z' },
      { id: 'r014', source: '训练日志 #2956', original_value: '0.053', current_value: '0.053', change_type: 'threshold', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2956.json:L220', version: 'v2', created_at: '2026-06-21T10:25:00Z' },
      { id: 'r015', source: '指标采集 #2956', original_value: '0.041', current_value: '0.041', change_type: 'metric', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'metric_2956.json:L22', version: 'v2', created_at: '2026-06-21T10:30:00Z' },
      { id: 'r016', source: '训练日志 #2956', original_value: '0.036', current_value: '0.036', change_type: 'sample', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'train_log_2956.json:L156', version: 'v2', created_at: '2026-06-21T10:35:00Z' },
      { id: 'r017', source: '人工修正 #035', original_value: '0.046', current_value: '0.046', change_type: 'manual', status: 'processed', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'manual_correction_035.json', version: 'v2', created_at: '2026-06-21T10:40:00Z' },
      { id: 'r018', source: '指标采集 #2956', original_value: '0.038', current_value: '0.038', change_type: 'metric', status: 'pending', is_contaminated: 0, contamination_note: null, next_steps: null, raw_log_ref: 'metric_2956.json:L30', version: 'v2', created_at: '2026-06-21T10:45:00Z' },
    ]

    for (const r of records) {
      insertRecord.run(
        r.id, r.source, r.original_value, r.current_value,
        r.change_type, r.status, r.is_contaminated,
        r.contamination_note, r.next_steps, r.raw_log_ref,
        r.version, r.created_at
      )
    }
  })

  seed()
}
