import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type { UserType, UserCategory, UserRole } from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '..', 'data', 'water_bill.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function initDatabase(): Database.Database {
  const dir = path.dirname(DB_PATH)
  mkdirSync(dir, { recursive: true })

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables(db)
  createIndexes(db)
  seedData(db)

  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_user (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      user_no TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      user_type TEXT NOT NULL,
      user_category TEXT NOT NULL,
      combined_group_id TEXT,
      population INTEGER,
      area REAL,
      address TEXT NOT NULL,
      contact TEXT,
      discount_rate REAL,
      discount_expire_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tier_price (
      id TEXT PRIMARY KEY,
      user_type TEXT NOT NULL,
      tier INTEGER NOT NULL,
      min_usage REAL NOT NULL,
      max_usage REAL NOT NULL,
      price_per_ton REAL NOT NULL,
      effective_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_record (
      id TEXT PRIMARY KEY,
      user_no TEXT NOT NULL,
      billing_month TEXT NOT NULL,
      last_reading REAL NOT NULL,
      current_reading REAL NOT NULL,
      usage REAL NOT NULL,
      paid_amount REAL NOT NULL,
      payment_date TEXT,
      source_file TEXT,
      import_task_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill (
      id TEXT PRIMARY KEY,
      user_no TEXT NOT NULL,
      billing_month TEXT NOT NULL,
      user_type TEXT NOT NULL,
      user_category TEXT NOT NULL,
      total_usage REAL NOT NULL,
      calculated_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      combined_group_id TEXT,
      allocation_method TEXT,
      review_comments TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      import_task_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_detail (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      tier INTEGER NOT NULL,
      usage REAL NOT NULL,
      price_per_ton REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bill(id)
    );

    CREATE TABLE IF NOT EXISTS bill_exception (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      human_readable TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolution TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bill(id)
    );

    CREATE TABLE IF NOT EXISTS import_task (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_file_path TEXT NOT NULL,
      total_records INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      error_details TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operation_log (
      id TEXT PRIMARY KEY,
      operator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );
  `)
}

function createIndexes(db: Database.Database): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_profile_user_no ON user_profile(user_no);
    CREATE INDEX IF NOT EXISTS idx_user_profile_type ON user_profile(user_type);
    CREATE INDEX IF NOT EXISTS idx_user_profile_category ON user_profile(user_category);
    CREATE INDEX IF NOT EXISTS idx_user_profile_group ON user_profile(combined_group_id);
    CREATE INDEX IF NOT EXISTS idx_tier_price_type ON tier_price(user_type);
    CREATE INDEX IF NOT EXISTS idx_payment_record_user_no ON payment_record(user_no);
    CREATE INDEX IF NOT EXISTS idx_payment_record_month ON payment_record(billing_month);
    CREATE INDEX IF NOT EXISTS idx_bill_user_no ON bill(user_no);
    CREATE INDEX IF NOT EXISTS idx_bill_month ON bill(billing_month);
    CREATE INDEX IF NOT EXISTS idx_bill_status ON bill(status);
    CREATE INDEX IF NOT EXISTS idx_bill_group ON bill(combined_group_id);
    CREATE INDEX IF NOT EXISTS idx_bill_detail_bill_id ON bill_detail(bill_id);
    CREATE INDEX IF NOT EXISTS idx_bill_exception_bill_id ON bill_exception(bill_id);
    CREATE INDEX IF NOT EXISTS idx_bill_exception_type ON bill_exception(type);
    CREATE INDEX IF NOT EXISTS idx_import_task_status ON import_task(status);
    CREATE INDEX IF NOT EXISTS idx_operation_log_operator ON operation_log(operator_id);
  `)
}

function seedData(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM system_user').get() as { cnt: number }
  if (count.cnt > 0) return

  const now = new Date().toISOString()

  seedSystemUsers(db, now)
  seedTierPrices(db, now)
  seedUserProfiles(db, now)
  seedPaymentRecords(db, now)
}

function seedSystemUsers(db: Database.Database, now: string): void {
  const insert = db.prepare(
    'INSERT INTO system_user (id, username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const users: Array<{ username: string; password: string; name: string; role: UserRole }> = [
    { username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin' },
    { username: 'reviewer', password: 'reviewer123', name: '复核员', role: 'reviewer' },
    { username: 'supervisor', password: 'super123', name: '主管', role: 'supervisor' },
  ]
  const transaction = db.transaction(() => {
    for (const u of users) {
      insert.run(uuidv4(), u.username, u.password, u.name, u.role, now)
    }
  })
  transaction()
}

function seedTierPrices(db: Database.Database, now: string): void {
  const insert = db.prepare(
    'INSERT INTO tier_price (id, user_type, tier, min_usage, max_usage, price_per_ton, effective_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const prices: Array<{ user_type: UserType; tier: number; min_usage: number; max_usage: number; price_per_ton: number }> = [
    { user_type: 'resident', tier: 1, min_usage: 0, max_usage: 15, price_per_ton: 3.5 },
    { user_type: 'resident', tier: 2, min_usage: 15, max_usage: 25, price_per_ton: 5.25 },
    { user_type: 'resident', tier: 3, min_usage: 25, max_usage: 999999, price_per_ton: 7.0 },
    { user_type: 'commercial', tier: 1, min_usage: 0, max_usage: 30, price_per_ton: 4.5 },
    { user_type: 'commercial', tier: 2, min_usage: 30, max_usage: 50, price_per_ton: 6.75 },
    { user_type: 'commercial', tier: 3, min_usage: 50, max_usage: 999999, price_per_ton: 9.0 },
    { user_type: 'industrial', tier: 1, min_usage: 0, max_usage: 100, price_per_ton: 4.0 },
    { user_type: 'industrial', tier: 2, min_usage: 100, max_usage: 200, price_per_ton: 6.0 },
    { user_type: 'industrial', tier: 3, min_usage: 200, max_usage: 999999, price_per_ton: 8.0 },
  ]
  const transaction = db.transaction(() => {
    for (const p of prices) {
      insert.run(uuidv4(), p.user_type, p.tier, p.min_usage, p.max_usage, p.price_per_ton, '2024-01-01')
    }
  })
  transaction()
}

function seedUserProfiles(db: Database.Database, now: string): void {
  const insert = db.prepare(
    `INSERT INTO user_profile (id, user_no, name, user_type, user_category, combined_group_id, population, area, address, contact, discount_rate, discount_expire_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const profiles: Array<{
    user_no: string; name: string; user_type: UserType; user_category: UserCategory;
    combined_group_id: string | null; population: number | null; area: number | null;
    address: string; contact: string | null; discount_rate: number | null; discount_expire_date: string | null
  }> = [
    { user_no: 'R001', name: '张三', user_type: 'resident', user_category: 'single', combined_group_id: null, population: 3, area: 80, address: '翠苑街道1号101室', contact: '13800001001', discount_rate: null, discount_expire_date: null },
    { user_no: 'R002', name: '李四', user_type: 'resident', user_category: 'single', combined_group_id: null, population: 4, area: 100, address: '翠苑街道1号102室', contact: '13800001002', discount_rate: 0.2, discount_expire_date: '2025-06-30' },
    { user_no: 'R003', name: '王五', user_type: 'resident', user_category: 'combined', combined_group_id: 'G001', population: 3, area: 80, address: '翠苑街道2号201室', contact: '13800001003', discount_rate: null, discount_expire_date: null },
    { user_no: 'R004', name: '赵六', user_type: 'resident', user_category: 'combined', combined_group_id: 'G001', population: 2, area: 60, address: '翠苑街道2号202室', contact: '13800001004', discount_rate: null, discount_expire_date: null },
    { user_no: 'R005', name: '钱七', user_type: 'resident', user_category: 'combined', combined_group_id: 'G001', population: 4, area: 90, address: '翠苑街道2号203室', contact: '13800001005', discount_rate: 0.15, discount_expire_date: '2024-01-15' },
    { user_no: 'R006', name: '孙八', user_type: 'resident', user_category: 'combined', combined_group_id: 'G002', population: 2, area: 70, address: '文三路10号301室', contact: '13800001006', discount_rate: null, discount_expire_date: null },
    { user_no: 'R007', name: '周九', user_type: 'resident', user_category: 'combined', combined_group_id: 'G002', population: 3, area: 80, address: '文三路10号302室', contact: '13800001007', discount_rate: null, discount_expire_date: null },
    { user_no: 'R008', name: '吴十', user_type: 'resident', user_category: 'single', combined_group_id: null, population: 5, area: 120, address: '翠苑街道3号101室', contact: '13800001008', discount_rate: 0.3, discount_expire_date: '2024-06-30' },
    { user_no: 'R009', name: '郑十一', user_type: 'resident', user_category: 'single', combined_group_id: null, population: 2, area: 60, address: '翠苑街道3号102室', contact: '13800001009', discount_rate: null, discount_expire_date: null },
    { user_no: 'C001', name: '华润超市', user_type: 'commercial', user_category: 'single', combined_group_id: null, population: null, area: 200, address: '文三路100号', contact: '13800002001', discount_rate: null, discount_expire_date: null },
    { user_no: 'C002', name: '星巴克文三店', user_type: 'commercial', user_category: 'single', combined_group_id: null, population: null, area: 150, address: '文三路120号', contact: '13800002002', discount_rate: 0.1, discount_expire_date: '2023-12-31' },
    { user_no: 'I001', name: '杭州钢铁厂', user_type: 'industrial', user_category: 'single', combined_group_id: null, population: null, area: 5000, address: '工业园区1号', contact: '13800003001', discount_rate: null, discount_expire_date: null },
    { user_no: 'I002', name: '汽车零部件厂', user_type: 'industrial', user_category: 'single', combined_group_id: null, population: null, area: 3000, address: '工业园区2号', contact: '13800003002', discount_rate: 0.05, discount_expire_date: '2025-12-31' },
    { user_no: 'T001', name: '临时施工点A', user_type: 'temporary', user_category: 'single', combined_group_id: null, population: null, area: null, address: '工地A', contact: '13800004001', discount_rate: null, discount_expire_date: null },
  ]
  const transaction = db.transaction(() => {
    for (const p of profiles) {
      insert.run(uuidv4(), p.user_no, p.name, p.user_type, p.user_category, p.combined_group_id, p.population, p.area, p.address, p.contact, p.discount_rate, p.discount_expire_date, now)
    }
  })
  transaction()
}

function seedPaymentRecords(db: Database.Database, now: string): void {
  const insert = db.prepare(
    `INSERT INTO payment_record (id, user_no, billing_month, last_reading, current_reading, usage, paid_amount, payment_date, source_file, import_task_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const records: Array<{
    user_no: string; billing_month: string; last_reading: number; current_reading: number;
    usage: number; paid_amount: number; payment_date: string | null
  }> = [
    { user_no: 'R001', billing_month: '2024-01', last_reading: 100, current_reading: 118, usage: 18, paid_amount: 68.25, payment_date: '2024-02-05' },
    { user_no: 'R002', billing_month: '2024-01', last_reading: 200, current_reading: 220, usage: 20, paid_amount: 63.00, payment_date: '2024-02-05' },
    { user_no: 'R003', billing_month: '2024-01', last_reading: 500, current_reading: 560, usage: 60, paid_amount: 350.00, payment_date: '2024-02-06' },
    { user_no: 'R006', billing_month: '2024-01', last_reading: 300, current_reading: 335, usage: 35, paid_amount: 175.00, payment_date: '2024-02-06' },
    { user_no: 'R008', billing_month: '2024-01', last_reading: 80, current_reading: 0, usage: 0, paid_amount: 0, payment_date: null },
    { user_no: 'R009', billing_month: '2024-01', last_reading: 50, current_reading: 62, usage: 12, paid_amount: 42.00, payment_date: '2024-02-05' },
    { user_no: 'C001', billing_month: '2024-01', last_reading: 1000, current_reading: 1250, usage: 250, paid_amount: 2070.00, payment_date: '2024-02-10' },
    { user_no: 'C002', billing_month: '2024-01', last_reading: 500, current_reading: 580, usage: 80, paid_amount: 540.00, payment_date: '2024-02-10' },
    { user_no: 'I001', billing_month: '2024-01', last_reading: 5000, current_reading: 6200, usage: 1200, paid_amount: 9000.00, payment_date: '2024-02-15' },
    { user_no: 'I002', billing_month: '2024-01', last_reading: 2000, current_reading: 2800, usage: 800, paid_amount: 5800.00, payment_date: '2024-02-15' },
    { user_no: 'T001', billing_month: '2024-01', last_reading: 0, current_reading: 50, usage: 50, paid_amount: 280.00, payment_date: '2024-02-15' },

    { user_no: 'R001', billing_month: '2024-02', last_reading: 118, current_reading: 138, usage: 20, paid_amount: 78.75, payment_date: '2024-03-05' },
    { user_no: 'R002', billing_month: '2024-02', last_reading: 220, current_reading: 245, usage: 25, paid_amount: 87.50, payment_date: '2024-03-05' },
    { user_no: 'R003', billing_month: '2024-02', last_reading: 560, current_reading: 625, usage: 65, paid_amount: 385.00, payment_date: '2024-03-06' },
    { user_no: 'R006', billing_month: '2024-02', last_reading: 335, current_reading: 375, usage: 40, paid_amount: 210.00, payment_date: '2024-03-06' },
    { user_no: 'R008', billing_month: '2024-02', last_reading: 0, current_reading: 0, usage: 0, paid_amount: 0, payment_date: null },
    { user_no: 'R009', billing_month: '2024-02', last_reading: 62, current_reading: 78, usage: 16, paid_amount: 56.00, payment_date: '2024-03-05' },
    { user_no: 'C001', billing_month: '2024-02', last_reading: 1250, current_reading: 1530, usage: 280, paid_amount: 2340.00, payment_date: '2024-03-10' },
    { user_no: 'C002', billing_month: '2024-02', last_reading: 580, current_reading: 660, usage: 80, paid_amount: 540.00, payment_date: '2024-03-10' },
    { user_no: 'I001', billing_month: '2024-02', last_reading: 6200, current_reading: 7500, usage: 1300, paid_amount: 9800.00, payment_date: '2024-03-15' },
    { user_no: 'I002', billing_month: '2024-02', last_reading: 2800, current_reading: 3600, usage: 800, paid_amount: 5800.00, payment_date: '2024-03-15' },
    { user_no: 'T001', billing_month: '2024-02', last_reading: 50, current_reading: 100, usage: 50, paid_amount: 280.00, payment_date: '2024-03-15' },
  ]
  const transaction = db.transaction(() => {
    for (const r of records) {
      insert.run(uuidv4(), r.user_no, r.billing_month, r.last_reading, r.current_reading, r.usage, r.paid_amount, r.payment_date, null, null, now)
    }
  })
  transaction()
}
