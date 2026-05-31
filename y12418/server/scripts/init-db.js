import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/deferral.db')

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS membership_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_no TEXT UNIQUE NOT NULL,
    member_name TEXT NOT NULL,
    member_phone TEXT,
    membership_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_amount REAL NOT NULL,
    total_months INTEGER NOT NULL,
    monthly_fee REAL NOT NULL,
    remark TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entry_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    entry_date TEXT NOT NULL,
    entry_type TEXT DEFAULT 'normal',
    venue TEXT,
    coach TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES membership_contracts(id)
  );

  CREATE TABLE IF NOT EXISTS freeze_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    freeze_start_date TEXT NOT NULL,
    freeze_end_date TEXT NOT NULL,
    freeze_days INTEGER NOT NULL,
    freeze_reason TEXT,
    status TEXT DEFAULT 'approved',
    is_cross_month INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES membership_contracts(id)
  );

  CREATE TABLE IF NOT EXISTS makeup_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    original_entry_id INTEGER,
    lesson_date TEXT NOT NULL,
    makeup_date TEXT,
    status TEXT DEFAULT 'pending',
    is_withdrawn INTEGER DEFAULT 0,
    withdrawn_at TEXT,
    remark TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES membership_contracts(id),
    FOREIGN KEY (original_entry_id) REFERENCES entry_records(id)
  );

  CREATE TABLE IF NOT EXISTS transfer_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    from_member TEXT NOT NULL,
    to_member TEXT NOT NULL,
    transfer_date TEXT NOT NULL,
    transfer_fee REAL DEFAULT 0,
    is_retroactive INTEGER DEFAULT 0,
    retroactive_month TEXT,
    remark TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES membership_contracts(id)
  );

  CREATE TABLE IF NOT EXISTS rule_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    rule_name TEXT NOT NULL,
    rule_content TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deferral_calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    calculation_month TEXT NOT NULL,
    rule_version_id INTEGER NOT NULL,
    deferred_amount REAL NOT NULL,
    recognized_amount REAL NOT NULL,
    calculation_logic TEXT NOT NULL,
    affected_by TEXT,
    is_manual_corrected INTEGER DEFAULT 0,
    correction_remark TEXT,
    calculation_hash TEXT,
    has_withdrawn_makeup INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES membership_contracts(id),
    FOREIGN KEY (rule_version_id) REFERENCES rule_versions(id)
  );

  CREATE TABLE IF NOT EXISTS correction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deferral_calc_id INTEGER NOT NULL,
    old_deferred_amount REAL NOT NULL,
    new_deferred_amount REAL NOT NULL,
    old_recognized_amount REAL NOT NULL,
    new_recognized_amount REAL NOT NULL,
    old_rule_version_id INTEGER,
    new_rule_version_id INTEGER,
    correction_reason TEXT,
    corrected_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deferral_calc_id) REFERENCES deferral_calculations(id)
  );

  CREATE TABLE IF NOT EXISTS report_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_month TEXT NOT NULL,
    report_type TEXT NOT NULL,
    rule_version_id INTEGER NOT NULL,
    file_path TEXT,
    export_status TEXT DEFAULT 'completed',
    total_records INTEGER,
    total_deferred_amount REAL,
    total_recognized_amount REAL,
    exported_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_version_id) REFERENCES rule_versions(id)
  );

  CREATE TABLE IF NOT EXISTS discrepancy_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    analysis_month TEXT NOT NULL,
    contract_amount REAL NOT NULL,
    deferred_amount REAL NOT NULL,
    difference_amount REAL NOT NULL,
    cause_type TEXT NOT NULL,
    cause_description TEXT NOT NULL,
    related_record_type TEXT,
    related_record_id INTEGER,
    is_resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES membership_contracts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_contract_no ON membership_contracts(contract_no);
  CREATE INDEX IF NOT EXISTS idx_entry_contract ON entry_records(contract_id);
  CREATE INDEX IF NOT EXISTS idx_freeze_contract ON freeze_applications(contract_id);
  CREATE INDEX IF NOT EXISTS idx_makeup_contract ON makeup_lessons(contract_id);
  CREATE INDEX IF NOT EXISTS idx_transfer_contract ON transfer_records(contract_id);
  CREATE INDEX IF NOT EXISTS idx_deferral_contract ON deferral_calculations(contract_id);
  CREATE INDEX IF NOT EXISTS idx_deferral_month ON deferral_calculations(calculation_month);
  CREATE INDEX IF NOT EXISTS idx_discrepancy_contract ON discrepancy_analysis(contract_id);
`)

const insertRule = db.prepare(`
  INSERT OR IGNORE INTO rule_versions (version, rule_name, rule_content, effective_date, is_active, created_by)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const rules = [
  ['v1.0', '基础递延规则', '按合同月均费用直线法递延', '2024-01-01', 1, 'system'],
  ['v1.1', '冻结跨月规则', '冻结跨月时按实际冻结天数分摊', '2024-03-01', 1, 'system'],
  ['v1.2', '转让追溯规则', '转让发生时追溯调整当月递延', '2024-06-01', 1, 'system'],
  ['v1.3', '补课去重规则', '补课单不重复确认收入', '2024-09-01', 1, 'system']
]

rules.forEach(rule => insertRule.run(...rule))

const insertContract = db.prepare(`
  INSERT INTO membership_contracts (contract_no, member_name, member_phone, membership_type, start_date, end_date, total_amount, total_months, monthly_fee, remark, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const sampleContracts = [
  ['HY20240001', '张三', '13800138001', '年度会员', '2024-01-01', '2024-12-31', 12000, 12, 1000, '羽毛球年度会员', 'active'],
  ['HY20240002', '李四', '13800138002', '季度会员', '2024-01-15', '2024-04-14', 3000, 3, 1000, '网球季度会员', 'active'],
  ['HY20240003', '王五', '13800138003', '半年度会员', '2024-02-01', '2024-07-31', 6000, 6, 1000, '游泳半年卡', 'active'],
  ['HY20240004', '赵六', '13800138004', '年度会员', '2024-03-01', '2025-02-28', 10800, 12, 900, '健身年卡（优惠）', 'active']
]

sampleContracts.forEach(c => insertContract.run(...c))

const insertEntry = db.prepare(`
  INSERT INTO entry_records (contract_id, entry_date, entry_type, venue, coach)
  VALUES (?, ?, ?, ?, ?)
`)

const sampleEntries = [
  [1, '2024-01-05', 'normal', '主馆A场', '陈教练'],
  [1, '2024-01-12', 'normal', '主馆B场', '陈教练'],
  [1, '2024-02-03', 'normal', '主馆A场', '王教练'],
  [2, '2024-01-20', 'normal', '网球场1号', '李教练'],
  [3, '2024-02-10', 'normal', '游泳馆', '张教练']
]

sampleEntries.forEach(e => insertEntry.run(...e))

const insertFreeze = db.prepare(`
  INSERT INTO freeze_applications (contract_id, freeze_start_date, freeze_end_date, freeze_days, freeze_reason, status, is_cross_month)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const sampleFreezes = [
  [1, '2024-02-15', '2024-03-15', 29, '出差', 'approved', 1],
  [3, '2024-04-01', '2024-04-15', 15, '受伤休养', 'approved', 0]
]

sampleFreezes.forEach(f => insertFreeze.run(...f))

const insertMakeup = db.prepare(`
  INSERT INTO makeup_lessons (contract_id, original_entry_id, lesson_date, makeup_date, status, is_withdrawn, remark)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const sampleMakeups = [
  [1, 2, '2024-01-12', '2024-01-26', 'completed', 0, '因事补课'],
  [2, null, '2024-02-01', null, 'pending', 1, '临时取消补课']
]

sampleMakeups.forEach(m => insertMakeup.run(...m))

const insertTransfer = db.prepare(`
  INSERT INTO transfer_records (contract_id, from_member, to_member, transfer_date, transfer_fee, is_retroactive, retroactive_month, remark)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const sampleTransfers = [
  [4, '赵六', '孙七', '2024-05-10', 200, 1, '2024-05', '年卡转让，追溯5月']
]

sampleTransfers.forEach(t => insertTransfer.run(...t))

console.log('数据库初始化完成！')
console.log('示例数据已插入')

db.close()
