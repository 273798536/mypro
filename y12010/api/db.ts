import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'carbon_margin.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDb(): void {
  const database = getDb()

  database.exec(`
    CREATE TABLE IF NOT EXISTS enterprise (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS batch (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'closed', 'settling'))
    );

    CREATE TABLE IF NOT EXISTS release_rule (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deal', 'cancel', 'compliance')),
      delay_days INTEGER NOT NULL DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS margin_record (
      id TEXT PRIMARY KEY,
      enterprise_id TEXT NOT NULL REFERENCES enterprise(id),
      batch_id TEXT NOT NULL REFERENCES batch(id),
      amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('locked', 'pending_release', 'released', 'delayed_release')),
      lock_time TEXT NOT NULL,
      release_time TEXT,
      release_rule_id TEXT REFERENCES release_rule(id),
      source TEXT NOT NULL CHECK(source IN ('manual', 'import', 'system')),
      source_file TEXT,
      source_line INTEGER,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "order" (
      id TEXT PRIMARY KEY,
      enterprise_id TEXT NOT NULL REFERENCES enterprise(id),
      batch_id TEXT NOT NULL REFERENCES batch(id),
      margin_record_id TEXT NOT NULL REFERENCES margin_record(id),
      type TEXT NOT NULL CHECK(type IN ('bid', 'ask')),
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'dealt', 'cancelled', 'complying', 'complied', 'overdue')),
      deal_time TEXT,
      cancel_time TEXT,
      compliance_deadline TEXT,
      compliance_time TEXT,
      split_from TEXT REFERENCES "order"(id),
      split_index INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('margin', 'order', 'rule', 'import')),
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'lock', 'release', 'import')),
      operator TEXT NOT NULL DEFAULT 'system',
      source TEXT NOT NULL CHECK(source IN ('manual', 'import', 'system')),
      source_file TEXT,
      source_line INTEGER,
      before_value TEXT,
      after_value TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS import_task (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('margin_flow', 'compliance_proof')),
      total_rows INTEGER NOT NULL DEFAULT 0,
      valid_rows INTEGER NOT NULL DEFAULT 0,
      bad_rows INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('previewing', 'confirmed', 'discarded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bad_row (
      id TEXT PRIMARY KEY,
      import_task_id TEXT NOT NULL REFERENCES import_task(id),
      row_number INTEGER NOT NULL,
      raw_content TEXT NOT NULL,
      reason TEXT NOT NULL CHECK(reason IN ('empty_row', 'remark_row', 'missing_column', 'format_error')),
      handled INTEGER NOT NULL DEFAULT 0,
      handle_action TEXT CHECK(handle_action IN ('restored', 'discarded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_margin_enterprise ON margin_record(enterprise_id);
    CREATE INDEX IF NOT EXISTS idx_margin_batch ON margin_record(batch_id);
    CREATE INDEX IF NOT EXISTS idx_margin_status ON margin_record(status);
    CREATE INDEX IF NOT EXISTS idx_order_enterprise ON "order"(enterprise_id);
    CREATE INDEX IF NOT EXISTS idx_order_batch ON "order"(batch_id);
    CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_badrow_task ON bad_row(import_task_id);
  `)

  seedData(database)
}

function seedData(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM enterprise').get() as { cnt: number }
  if (count.cnt > 0) return

  const now = new Date().toISOString()

  const enterprises = [
    { id: uuidv4(), name: '华能碳资产管理有限公司', code: 'ENT001', balance: 5000000 },
    { id: uuidv4(), name: '中电联碳交易有限公司', code: 'ENT002', balance: 3000000 },
    { id: uuidv4(), name: '国电投绿色能源有限公司', code: 'ENT003', balance: 4500000 },
    { id: uuidv4(), name: '华电环保科技有限公司', code: 'ENT004', balance: 2800000 },
    { id: uuidv4(), name: '大唐碳资产运营有限公司', code: 'ENT005', balance: 3500000 },
  ]

  const insertEnt = db.prepare(
    'INSERT INTO enterprise (id, name, code, balance) VALUES (?, ?, ?, ?)'
  )

  const batches = [
    { id: uuidv4(), name: '2026年全国碳市场第一批次', start_date: '2026-01-15', end_date: '2026-06-30', status: 'active' },
    { id: uuidv4(), name: '2026年全国碳市场第二批次', start_date: '2026-04-01', end_date: '2026-09-30', status: 'active' },
    { id: uuidv4(), name: '2025年全国碳市场第四批次', start_date: '2025-10-01', end_date: '2026-03-31', status: 'settling' },
  ]

  const insertBatch = db.prepare(
    'INSERT INTO batch (id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)'
  )

  const rules = [
    { id: uuidv4(), name: '成交自动释放', type: 'deal', delay_days: 0, description: '竞价成交后自动释放保证金' },
    { id: uuidv4(), name: '撤单延迟释放T+3', type: 'cancel', delay_days: 3, description: '撤单后3个工作日释放保证金，防止恶意撤单' },
    { id: uuidv4(), name: '履约到期释放', type: 'compliance', delay_days: 0, description: '履约完成后自动释放剩余保证金' },
  ]

  const insertRule = db.prepare(
    'INSERT INTO release_rule (id, name, type, delay_days, description) VALUES (?, ?, ?, ?, ?)'
  )

  const insertMargin = db.prepare(
    `INSERT INTO margin_record (id, enterprise_id, batch_id, amount, status, lock_time, release_time, release_rule_id, source, source_file, source_line, remark, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const insertOrder = db.prepare(
    `INSERT INTO "order" (id, enterprise_id, batch_id, margin_record_id, type, quantity, price, status, deal_time, cancel_time, compliance_deadline, compliance_time, split_from, split_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const insertAudit = db.prepare(
    `INSERT INTO audit_log (id, entity_type, entity_id, action, operator, source, source_file, source_line, before_value, after_value, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const tx = db.transaction(() => {
    for (const e of enterprises) insertEnt.run(e.id, e.name, e.code, e.balance)
    for (const b of batches) insertBatch.run(b.id, b.name, b.start_date, b.end_date, b.status)
    for (const r of rules) insertRule.run(r.id, r.name, r.type, r.delay_days, r.description)

    const [e1, e2, e3, e4, e5] = enterprises
    const [b1, b2, b3] = batches
    const [rDeal, rCancel, rCompliance] = rules

    const margin1 = {
      id: uuidv4(), enterprise_id: e1.id, batch_id: b1.id, amount: 500000,
      status: 'locked', lock_time: '2026-02-01T09:00:00Z', release_time: null,
      release_rule_id: null, source: 'manual', source_file: null, source_line: null,
      remark: '华能第一批次竞价保证金'
    }
    const margin2 = {
      id: uuidv4(), enterprise_id: e1.id, batch_id: b2.id, amount: 300000,
      status: 'locked', lock_time: '2026-04-05T10:30:00Z', release_time: null,
      release_rule_id: null, source: 'manual', source_file: null, source_line: null,
      remark: '华能第二批次竞价保证金'
    }
    const margin3 = {
      id: uuidv4(), enterprise_id: e2.id, batch_id: b1.id, amount: 400000,
      status: 'pending_release', lock_time: '2026-02-10T14:00:00Z',
      release_time: '2026-03-15T16:00:00Z',
      release_rule_id: rDeal.id, source: 'manual', source_file: null, source_line: null,
      remark: '中电联第一批次成交释放'
    }
    const margin4 = {
      id: uuidv4(), enterprise_id: e3.id, batch_id: b3.id, amount: 600000,
      status: 'delayed_release', lock_time: '2025-11-01T08:00:00Z',
      release_time: null, release_rule_id: rCancel.id, source: 'manual',
      source_file: null, source_line: null,
      remark: '国电投撤单延迟释放'
    }
    const margin5 = {
      id: uuidv4(), enterprise_id: e4.id, batch_id: b1.id, amount: 250000,
      status: 'released', lock_time: '2026-01-20T11:00:00Z',
      release_time: '2026-02-28T17:00:00Z',
      release_rule_id: rCompliance.id, source: 'import',
      source_file: 'margin_2026Q1.xlsx', source_line: 12,
      remark: '华电履约完成释放'
    }
    const margin6 = {
      id: uuidv4(), enterprise_id: e5.id, batch_id: b2.id, amount: 350000,
      status: 'locked', lock_time: '2026-04-15T09:00:00Z', release_time: null,
      release_rule_id: null, source: 'manual', source_file: null, source_line: null,
      remark: '大唐第二批次竞价保证金'
    }
    const margin7 = {
      id: uuidv4(), enterprise_id: e2.id, batch_id: b3.id, amount: 200000,
      status: 'released', lock_time: '2025-10-15T10:00:00Z',
      release_time: '2025-12-20T14:00:00Z',
      release_rule_id: rDeal.id, source: 'import',
      source_file: 'margin_2025Q4.xlsx', source_line: 8,
      remark: '中电联第四批次成交释放'
    }
    const margin8 = {
      id: uuidv4(), enterprise_id: e3.id, batch_id: b1.id, amount: 450000,
      status: 'pending_release', lock_time: '2026-02-20T13:00:00Z',
      release_time: '2026-04-10T15:00:00Z',
      release_rule_id: rDeal.id, source: 'manual', source_file: null, source_line: null,
      remark: '国电投第一批次成交待释放'
    }

    const allMargins = [margin1, margin2, margin3, margin4, margin5, margin6, margin7, margin8]
    for (const m of allMargins) {
      insertMargin.run(
        m.id, m.enterprise_id, m.batch_id, m.amount, m.status,
        m.lock_time, m.release_time, m.release_rule_id, m.source,
        m.source_file, m.source_line, m.remark, now, now
      )
    }

    const order1 = {
      id: uuidv4(), enterprise_id: e1.id, batch_id: b1.id, margin_record_id: margin1.id,
      type: 'bid', quantity: 10000, price: 55.0, status: 'dealt',
      deal_time: '2026-02-15T10:00:00Z', cancel_time: null,
      compliance_deadline: '2026-06-30T23:59:59Z', compliance_time: null,
      split_from: null, split_index: null
    }
    const order1Split1 = {
      id: uuidv4(), enterprise_id: e1.id, batch_id: b1.id, margin_record_id: margin1.id,
      type: 'bid', quantity: 6000, price: 55.0, status: 'dealt',
      deal_time: '2026-02-15T10:00:00Z', cancel_time: null,
      compliance_deadline: '2026-06-30T23:59:59Z', compliance_time: null,
      split_from: order1.id, split_index: 1
    }
    const order1Split2 = {
      id: uuidv4(), enterprise_id: e1.id, batch_id: b1.id, margin_record_id: margin1.id,
      type: 'bid', quantity: 4000, price: 54.5, status: 'dealt',
      deal_time: '2026-02-15T10:05:00Z', cancel_time: null,
      compliance_deadline: '2026-06-30T23:59:59Z', compliance_time: null,
      split_from: order1.id, split_index: 2
    }
    const order2 = {
      id: uuidv4(), enterprise_id: e1.id, batch_id: b2.id, margin_record_id: margin2.id,
      type: 'bid', quantity: 5000, price: 56.0, status: 'pending',
      deal_time: null, cancel_time: null,
      compliance_deadline: null, compliance_time: null,
      split_from: null, split_index: null
    }
    const order3 = {
      id: uuidv4(), enterprise_id: e2.id, batch_id: b1.id, margin_record_id: margin3.id,
      type: 'ask', quantity: 8000, price: 53.0, status: 'dealt',
      deal_time: '2026-02-20T11:00:00Z', cancel_time: null,
      compliance_deadline: '2026-06-30T23:59:59Z', compliance_time: '2026-05-10T09:00:00Z',
      split_from: null, split_index: null
    }
    const order4 = {
      id: uuidv4(), enterprise_id: e3.id, batch_id: b3.id, margin_record_id: margin4.id,
      type: 'bid', quantity: 12000, price: 50.0, status: 'cancelled',
      deal_time: null, cancel_time: '2025-12-15T14:00:00Z',
      compliance_deadline: null, compliance_time: null,
      split_from: null, split_index: null
    }
    const order5 = {
      id: uuidv4(), enterprise_id: e4.id, batch_id: b1.id, margin_record_id: margin5.id,
      type: 'ask', quantity: 5000, price: 52.0, status: 'complied',
      deal_time: '2026-01-25T09:30:00Z', cancel_time: null,
      compliance_deadline: '2026-03-31T23:59:59Z', compliance_time: '2026-02-28T16:00:00Z',
      split_from: null, split_index: null
    }
    const order6 = {
      id: uuidv4(), enterprise_id: e5.id, batch_id: b2.id, margin_record_id: margin6.id,
      type: 'bid', quantity: 7000, price: 57.0, status: 'complying',
      deal_time: '2026-04-20T10:00:00Z', cancel_time: null,
      compliance_deadline: '2026-09-30T23:59:59Z', compliance_time: null,
      split_from: null, split_index: null
    }
    const order7 = {
      id: uuidv4(), enterprise_id: e2.id, batch_id: b3.id, margin_record_id: margin7.id,
      type: 'ask', quantity: 4000, price: 51.0, status: 'complied',
      deal_time: '2025-10-25T11:00:00Z', cancel_time: null,
      compliance_deadline: '2026-01-31T23:59:59Z', compliance_time: '2025-12-20T14:00:00Z',
      split_from: null, split_index: null
    }
    const order8 = {
      id: uuidv4(), enterprise_id: e3.id, batch_id: b1.id, margin_record_id: margin8.id,
      type: 'bid', quantity: 9000, price: 54.0, status: 'overdue',
      deal_time: '2026-02-25T10:00:00Z', cancel_time: null,
      compliance_deadline: '2026-04-30T23:59:59Z', compliance_time: null,
      split_from: null, split_index: null
    }

    const allOrders = [order1, order1Split1, order1Split2, order2, order3, order4, order5, order6, order7, order8]
    for (const o of allOrders) {
      insertOrder.run(
        o.id, o.enterprise_id, o.batch_id, o.margin_record_id,
        o.type, o.quantity, o.price, o.status,
        o.deal_time, o.cancel_time, o.compliance_deadline, o.compliance_time,
        o.split_from, o.split_index, now, now
      )
    }

    for (const m of allMargins) {
      insertAudit.run(
        uuidv4(), 'margin', m.id, 'lock', 'admin', m.source,
        m.source_file, m.source_line, null,
        JSON.stringify({ status: 'locked', amount: m.amount, enterprise_id: m.enterprise_id, batch_id: m.batch_id }),
        now
      )
    }

    for (const o of allOrders) {
      insertAudit.run(
        uuidv4(), 'order', o.id, 'create', 'system', 'system',
        null, null, null,
        JSON.stringify({ status: o.status, enterprise_id: o.enterprise_id, quantity: o.quantity, price: o.price }),
        now
      )
    }
  })

  tx()
}
