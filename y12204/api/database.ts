import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'data', 'billqueue.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeTables()
    seedData()
  }
  return db
}

function initializeTables(): void {
  const d = db!

  d.exec(`
    CREATE TABLE IF NOT EXISTS cash_plans (
      id TEXT PRIMARY KEY,
      plan_no TEXT NOT NULL UNIQUE,
      period TEXT NOT NULL,
      total_budget REAL NOT NULL,
      allocated_amount REAL NOT NULL DEFAULT 0,
      locked_amount REAL NOT NULL DEFAULT 0,
      available_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_no TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      anomaly_type TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS bill_registrations (
      id TEXT PRIMARY KEY,
      bill_no TEXT NOT NULL,
      drawer TEXT NOT NULL,
      payee TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      acceptor TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      priority_score REAL NOT NULL DEFAULT 0,
      cash_plan_id TEXT,
      event_id TEXT NOT NULL,
      has_duplicate INTEGER NOT NULL DEFAULT 0,
      has_dispute INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (cash_plan_id) REFERENCES cash_plans(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS fund_locks (
      id TEXT PRIMARY KEY,
      cash_plan_id TEXT NOT NULL,
      bill_id TEXT NOT NULL,
      locked_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      locked_at TEXT,
      released_at TEXT,
      FOREIGN KEY (cash_plan_id) REFERENCES cash_plans(id),
      FOREIGN KEY (bill_id) REFERENCES bill_registrations(id)
    );

    CREATE TABLE IF NOT EXISTS payment_applications (
      id TEXT PRIMARY KEY,
      application_no TEXT NOT NULL UNIQUE,
      bill_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      applicant TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (bill_id) REFERENCES bill_registrations(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS event_links (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS event_timeline_items (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      reference_no TEXT NOT NULL,
      description TEXT NOT NULL,
      operator TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS anomaly_diagnoses (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      anomaly_type TEXT NOT NULL,
      trigger_material TEXT NOT NULL,
      trigger_reference TEXT NOT NULL,
      current_blocker TEXT NOT NULL,
      next_action TEXT NOT NULL,
      next_material_needed TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      reporter TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      resolved_at TEXT,
      FOREIGN KEY (bill_id) REFERENCES bill_registrations(id)
    );

    CREATE TABLE IF NOT EXISTS queue_reports (
      id TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      total_bills INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      locked_amount REAL NOT NULL,
      shortfalls INTEGER NOT NULL DEFAULT 0,
      duplicates INTEGER NOT NULL DEFAULT 0,
      disputes INTEGER NOT NULL DEFAULT 0,
      fund_lock_methodology TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transfer_records (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      from_user TEXT NOT NULL,
      to_user TEXT NOT NULL,
      fund_lock_note TEXT NOT NULL,
      transferred_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (report_id) REFERENCES queue_reports(id)
    );

    CREATE INDEX IF NOT EXISTS idx_bills_status ON bill_registrations(status);
    CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bill_registrations(due_date);
    CREATE INDEX IF NOT EXISTS idx_bills_event ON bill_registrations(event_id);
    CREATE INDEX IF NOT EXISTS idx_bills_bill_no ON bill_registrations(bill_no);
    CREATE INDEX IF NOT EXISTS idx_fund_locks_bill ON fund_locks(bill_id);
    CREATE INDEX IF NOT EXISTS idx_fund_locks_status ON fund_locks(status);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_anomaly ON events(anomaly_type);
    CREATE INDEX IF NOT EXISTS idx_timeline_event ON event_timeline_items(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_links_event ON event_links(event_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_bill ON disputes(bill_id);
  `)
}

function seedData(): void {
  const d = db!
  const count = d.prepare('SELECT COUNT(*) as cnt FROM cash_plans').get() as { cnt: number }
  if (count.cnt > 0) return

  const insertCashPlan = d.prepare(`
    INSERT INTO cash_plans (id, plan_no, period, total_budget, allocated_amount, locked_amount, available_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const cashPlans = [
    { id: 'cp-001', planNo: 'CP-2026-Q2-001', period: '2026年Q2', totalBudget: 5000000, allocated: 3200000, locked: 2800000, available: 1800000, status: 'active' },
    { id: 'cp-002', planNo: 'CP-2026-Q2-002', period: '2026年Q2', totalBudget: 3000000, allocated: 2900000, locked: 2500000, available: 100000, status: 'active' },
    { id: 'cp-003', planNo: 'CP-2026-Q3-001', period: '2026年Q3', totalBudget: 8000000, allocated: 1500000, locked: 1200000, available: 6500000, status: 'active' },
  ]

  for (const cp of cashPlans) {
    insertCashPlan.run(cp.id, cp.planNo, cp.period, cp.totalBudget, cp.allocated, cp.locked, cp.available, cp.status)
  }

  const insertEvent = d.prepare(`
    INSERT INTO events (id, event_no, title, anomaly_type, status)
    VALUES (?, ?, ?, ?, ?)
  `)

  const events = [
    { id: 'evt-001', eventNo: 'EVT-2026-0001', title: '华为技术商票兑付', anomalyType: null, status: 'in_progress' },
    { id: 'evt-002', eventNo: 'EVT-2026-0002', title: '中兴通讯商票兑付', anomalyType: null, status: 'in_progress' },
    { id: 'evt-003', eventNo: 'EVT-2026-0003', title: '比亚迪商票兑付', anomalyType: null, status: 'in_progress' },
    { id: 'evt-004', eventNo: 'EVT-2026-0004', title: '宁德时代商票兑付（重复票据）', anomalyType: 'duplicate', status: 'open' },
    { id: 'evt-005', eventNo: 'EVT-2026-0005', title: '格力电器商票兑付（插队争议）', anomalyType: 'dispute', status: 'open' },
    { id: 'evt-006', eventNo: 'EVT-2026-0006', title: '美的集团商票兑付（资金缺口）', anomalyType: 'shortfall', status: 'open' },
    { id: 'evt-007', eventNo: 'EVT-2026-0007', title: '海尔智家商票兑付', anomalyType: null, status: 'closed' },
    { id: 'evt-008', eventNo: 'EVT-2026-0008', title: 'TCL科技商票兑付', anomalyType: null, status: 'in_progress' },
  ]

  for (const e of events) {
    insertEvent.run(e.id, e.eventNo, e.title, e.anomalyType, e.status)
  }

  const insertBill = d.prepare(`
    INSERT INTO bill_registrations (id, bill_no, drawer, payee, amount, due_date, issue_date, acceptor, status, priority_score, cash_plan_id, event_id, has_duplicate, has_dispute, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const bills = [
    { id: 'bill-001', billNo: 'SP-2026-001', drawer: '华为技术有限公司', payee: '深圳供应链有限公司', amount: 800000, dueDate: '2026-06-15', issueDate: '2025-12-15', acceptor: '招商银行深圳分行', status: 'pending_payment', score: 92, cashPlanId: 'cp-001', eventId: 'evt-001', hasDup: 0, hasDis: 0, createdBy: '张运营' },
    { id: 'bill-002', billNo: 'SP-2026-002', drawer: '中兴通讯股份有限公司', payee: '南京物流有限公司', amount: 500000, dueDate: '2026-06-20', issueDate: '2025-12-20', acceptor: '中国银行南京分行', status: 'reviewed', score: 85, cashPlanId: 'cp-001', eventId: 'evt-002', hasDup: 0, hasDis: 0, createdBy: '张运营' },
    { id: 'bill-003', billNo: 'SP-2026-003', drawer: '比亚迪股份有限公司', payee: '深圳新能源有限公司', amount: 1200000, dueDate: '2026-07-01', issueDate: '2026-01-01', acceptor: '工商银行深圳分行', status: 'pending_review', score: 78, cashPlanId: null, eventId: 'evt-003', hasDup: 0, hasDis: 0, createdBy: '张运营' },
    { id: 'bill-004', billNo: 'SP-2026-004', drawer: '宁德时代新能源', payee: '宁德材料有限公司', amount: 600000, dueDate: '2026-06-10', issueDate: '2025-12-10', acceptor: '建设银行宁德分行', status: 'pending_review', score: 88, cashPlanId: null, eventId: 'evt-004', hasDup: 1, hasDis: 0, createdBy: '李运营' },
    { id: 'bill-005', billNo: 'SP-2026-005', drawer: '宁德时代新能源', payee: '宁德材料有限公司', amount: 600000, dueDate: '2026-06-10', issueDate: '2025-12-10', acceptor: '建设银行宁德分行', status: 'pending_review', score: 88, cashPlanId: null, eventId: 'evt-004', hasDup: 1, hasDis: 0, createdBy: '李运营' },
    { id: 'bill-006', billNo: 'SP-2026-006', drawer: '格力电器股份有限公司', payee: '珠海制冷有限公司', amount: 950000, dueDate: '2026-06-25', issueDate: '2025-12-25', acceptor: '农业银行珠海分行', status: 'reviewed', score: 95, cashPlanId: 'cp-002', eventId: 'evt-005', hasDup: 0, hasDis: 1, createdBy: '张运营' },
    { id: 'bill-007', billNo: 'SP-2026-007', drawer: '美的集团股份有限公司', payee: '佛山家电有限公司', amount: 750000, dueDate: '2026-07-05', issueDate: '2026-01-05', acceptor: '工商银行佛山分行', status: 'pending_review', score: 72, cashPlanId: null, eventId: 'evt-006', hasDup: 0, hasDis: 0, createdBy: '王运营' },
    { id: 'bill-008', billNo: 'SP-2026-008', drawer: '海尔智家股份有限公司', payee: '青岛智能有限公司', amount: 450000, dueDate: '2026-05-20', issueDate: '2025-11-20', acceptor: '中国银行青岛分行', status: 'paid', score: 90, cashPlanId: 'cp-001', eventId: 'evt-007', hasDup: 0, hasDis: 0, createdBy: '张运营' },
    { id: 'bill-009', billNo: 'SP-2026-009', drawer: 'TCL科技集团', payee: '惠州光电有限公司', amount: 680000, dueDate: '2026-06-30', issueDate: '2025-12-30', acceptor: '交通银行惠州分行', status: 'pending_payment', score: 82, cashPlanId: 'cp-003', eventId: 'evt-008', hasDup: 0, hasDis: 0, createdBy: '李运营' },
    { id: 'bill-010', billNo: 'SP-2026-010', drawer: '华为技术有限公司', payee: '东莞制造有限公司', amount: 350000, dueDate: '2026-07-15', issueDate: '2026-01-15', acceptor: '招商银行东莞分行', status: 'pending_review', score: 68, cashPlanId: null, eventId: 'evt-001', hasDup: 0, hasDis: 0, createdBy: '王运营' },
  ]

  for (const b of bills) {
    insertBill.run(b.id, b.billNo, b.drawer, b.payee, b.amount, b.dueDate, b.issueDate, b.acceptor, b.status, b.score, b.cashPlanId, b.eventId, b.hasDup, b.hasDis, b.createdBy)
  }

  const insertFundLock = d.prepare(`
    INSERT INTO fund_locks (id, cash_plan_id, bill_id, locked_amount, status, locked_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const fundLocks = [
    { id: 'fl-001', cpId: 'cp-001', billId: 'bill-001', amount: 800000, status: 'locked', lockedAt: '2026-05-20 09:30:00' },
    { id: 'fl-002', cpId: 'cp-002', billId: 'bill-006', amount: 950000, status: 'locked', lockedAt: '2026-05-21 14:15:00' },
    { id: 'fl-003', cpId: 'cp-003', billId: 'bill-009', amount: 680000, status: 'locked', lockedAt: '2026-05-22 10:00:00' },
    { id: 'fl-004', cpId: 'cp-001', billId: 'bill-008', amount: 450000, status: 'locked', lockedAt: '2026-05-10 08:00:00' },
    { id: 'fl-005', cpId: 'cp-002', billId: 'bill-007', amount: 750000, status: 'shortfall', lockedAt: null },
  ]

  for (const fl of fundLocks) {
    insertFundLock.run(fl.id, fl.cpId, fl.billId, fl.amount, fl.status, fl.lockedAt)
  }

  const insertApp = d.prepare(`
    INSERT INTO payment_applications (id, application_no, bill_id, event_id, amount, status, applicant)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const apps = [
    { id: 'app-001', appNo: 'PA-2026-001', billId: 'bill-001', eventId: 'evt-001', amount: 800000, status: 'approved', applicant: '张运营' },
    { id: 'app-002', appNo: 'PA-2026-002', billId: 'bill-009', eventId: 'evt-008', amount: 680000, status: 'approved', applicant: '李运营' },
    { id: 'app-003', appNo: 'PA-2026-003', billId: 'bill-008', eventId: 'evt-007', amount: 450000, status: 'completed', applicant: '张运营' },
  ]

  for (const a of apps) {
    insertApp.run(a.id, a.appNo, a.billId, a.eventId, a.amount, a.status, a.applicant)
  }

  const insertTimeline = d.prepare(`
    INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const timelineItems = [
    { id: 'tl-001', eventId: 'evt-001', type: 'bill_registration', refId: 'bill-001', refNo: 'SP-2026-001', desc: '新增商票登记 SP-2026-001，金额80万元', op: '张运营', ts: '2026-05-15 09:00:00' },
    { id: 'tl-002', eventId: 'evt-001', type: 'status_change', refId: 'bill-001', refNo: 'SP-2026-001', desc: '商票状态从"待复核"推进为"已复核"', op: '刘复核', ts: '2026-05-16 10:30:00' },
    { id: 'tl-003', eventId: 'evt-001', type: 'fund_lock', refId: 'fl-001', refNo: 'FL-001', desc: '资金锁定80万元，关联现金计划 CP-2026-Q2-001', op: '陈资金', ts: '2026-05-17 11:00:00' },
    { id: 'tl-004', eventId: 'evt-001', type: 'payment_application', refId: 'app-001', refNo: 'PA-2026-001', desc: '提交兑付申请 PA-2026-001，金额80万元', op: '张运营', ts: '2026-05-18 14:00:00' },
    { id: 'tl-005', eventId: 'evt-001', type: 'status_change', refId: 'bill-001', refNo: 'SP-2026-001', desc: '商票状态从"已复核"推进为"待兑付"', op: '刘复核', ts: '2026-05-19 09:30:00' },
    { id: 'tl-006', eventId: 'evt-001', type: 'bill_registration', refId: 'bill-010', refNo: 'SP-2026-010', desc: '新增关联商票登记 SP-2026-010，金额35万元', op: '王运营', ts: '2026-05-20 10:00:00' },
    { id: 'tl-007', eventId: 'evt-004', type: 'bill_registration', refId: 'bill-004', refNo: 'SP-2026-004', desc: '新增商票登记 SP-2026-004，金额60万元', op: '李运营', ts: '2026-05-18 09:00:00' },
    { id: 'tl-008', eventId: 'evt-004', type: 'anomaly_detected', refId: 'bill-005', refNo: 'SP-2026-005', desc: '检测到重复票据 SP-2026-005，与 SP-2026-004 相同出票人/金额/到期日', op: '系统', ts: '2026-05-18 09:01:00' },
    { id: 'tl-009', eventId: 'evt-005', type: 'bill_registration', refId: 'bill-006', refNo: 'SP-2026-006', desc: '新增商票登记 SP-2026-006，金额95万元，优先级评分95（异常偏高）', op: '张运营', ts: '2026-05-19 11:00:00' },
    { id: 'tl-010', eventId: 'evt-005', type: 'anomaly_detected', refId: 'bill-006', refNo: 'SP-2026-006', desc: '插队争议：优先级评分95与出票人资质不匹配，被标记争议', op: '系统', ts: '2026-05-19 11:01:00' },
    { id: 'tl-011', eventId: 'evt-006', type: 'bill_registration', refId: 'bill-007', refNo: 'SP-2026-007', desc: '新增商票登记 SP-2026-007，金额75万元', op: '王运营', ts: '2026-05-20 09:00:00' },
    { id: 'tl-012', eventId: 'evt-006', type: 'anomaly_detected', refId: 'fl-005', refNo: 'FL-005', desc: '资金缺口：现金计划 CP-2026-Q2-002 可用余额仅10万元，无法覆盖75万元', op: '系统', ts: '2026-05-20 09:01:00' },
    { id: 'tl-013', eventId: 'evt-007', type: 'bill_registration', refId: 'bill-008', refNo: 'SP-2026-008', desc: '新增商票登记 SP-2026-008，金额45万元', op: '张运营', ts: '2026-05-08 09:00:00' },
    { id: 'tl-014', eventId: 'evt-007', type: 'status_change', refId: 'bill-008', refNo: 'SP-2026-008', desc: '商票状态从"待复核"推进为"已复核"', op: '刘复核', ts: '2026-05-09 10:00:00' },
    { id: 'tl-015', eventId: 'evt-007', type: 'fund_lock', refId: 'fl-004', refNo: 'FL-004', desc: '资金锁定45万元，关联现金计划 CP-2026-Q2-001', op: '陈资金', ts: '2026-05-10 08:00:00' },
    { id: 'tl-016', eventId: 'evt-007', type: 'status_change', refId: 'bill-008', refNo: 'SP-2026-008', desc: '商票状态从"待兑付"推进为"已兑付"', op: '刘复核', ts: '2026-05-15 16:00:00' },
    { id: 'tl-017', eventId: 'evt-008', type: 'bill_registration', refId: 'bill-009', refNo: 'SP-2026-009', desc: '新增商票登记 SP-2026-009，金额68万元', op: '李运营', ts: '2026-05-21 09:00:00' },
    { id: 'tl-018', eventId: 'evt-008', type: 'fund_lock', refId: 'fl-003', refNo: 'FL-003', desc: '资金锁定68万元，关联现金计划 CP-2026-Q3-001', op: '陈资金', ts: '2026-05-22 10:00:00' },
  ]

  for (const t of timelineItems) {
    insertTimeline.run(t.id, t.eventId, t.type, t.refId, t.refNo, t.desc, t.op, t.ts)
  }

  const insertEventLink = d.prepare(`
    INSERT INTO event_links (id, event_id, target_type, target_id)
    VALUES (?, ?, ?, ?)
  `)

  const eventLinks = [
    { id: 'el-001', eventId: 'evt-001', type: 'bill', targetId: 'bill-001' },
    { id: 'el-002', eventId: 'evt-001', type: 'bill', targetId: 'bill-010' },
    { id: 'el-003', eventId: 'evt-001', type: 'cash_plan', targetId: 'cp-001' },
    { id: 'el-004', eventId: 'evt-001', type: 'payment_application', targetId: 'app-001' },
    { id: 'el-005', eventId: 'evt-002', type: 'bill', targetId: 'bill-002' },
    { id: 'el-006', eventId: 'evt-002', type: 'cash_plan', targetId: 'cp-001' },
    { id: 'el-007', eventId: 'evt-003', type: 'bill', targetId: 'bill-003' },
    { id: 'el-008', eventId: 'evt-004', type: 'bill', targetId: 'bill-004' },
    { id: 'el-009', eventId: 'evt-004', type: 'bill', targetId: 'bill-005' },
    { id: 'el-010', eventId: 'evt-005', type: 'bill', targetId: 'bill-006' },
    { id: 'el-011', eventId: 'evt-005', type: 'cash_plan', targetId: 'cp-002' },
    { id: 'el-012', eventId: 'evt-006', type: 'bill', targetId: 'bill-007' },
    { id: 'el-013', eventId: 'evt-006', type: 'cash_plan', targetId: 'cp-002' },
    { id: 'el-014', eventId: 'evt-007', type: 'bill', targetId: 'bill-008' },
    { id: 'el-015', eventId: 'evt-007', type: 'cash_plan', targetId: 'cp-001' },
    { id: 'el-016', eventId: 'evt-007', type: 'payment_application', targetId: 'app-003' },
    { id: 'el-017', eventId: 'evt-008', type: 'bill', targetId: 'bill-009' },
    { id: 'el-018', eventId: 'evt-008', type: 'cash_plan', targetId: 'cp-003' },
    { id: 'el-019', eventId: 'evt-008', type: 'payment_application', targetId: 'app-002' },
  ]

  for (const el of eventLinks) {
    insertEventLink.run(el.id, el.eventId, el.type, el.targetId)
  }

  const insertDiagnosis = d.prepare(`
    INSERT INTO anomaly_diagnoses (id, event_id, anomaly_type, trigger_material, trigger_reference, current_blocker, next_action, next_material_needed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const diagnoses = [
    { id: 'diag-001', eventId: 'evt-004', type: 'duplicate', trigger: '商票登记 SP-2026-004/005', triggerRef: 'SP-2026-004 & SP-2026-005', blocker: '两笔登记票号不同但出票人/金额/到期日完全一致，无法确认哪笔为重复录入', nextAction: '联系出票方确认真实票据数量', nextMaterial: '出票方盖章确认函' },
    { id: 'diag-002', eventId: 'evt-005', type: 'dispute', trigger: '优先级评分异常（95分）', triggerRef: 'SP-2026-006 评分95', blocker: '优先级评分与出票人格力电器的常规评级（B+）不匹配，评分依据待核实', nextAction: '核实优先级评分原始材料', nextMaterial: '优先级评分计算底稿及审批签字' },
    { id: 'diag-003', eventId: 'evt-006', type: 'shortfall', trigger: '现金计划 CP-2026-Q2-002 可用余额不足', triggerRef: 'CP-2026-Q2-002 余额10万/需75万', blocker: '现金计划可用余额仅10万元，缺口65万元', nextAction: '调整现金计划或追加资金', nextMaterial: '资金追加审批单或现金计划调整申请' },
  ]

  for (const dg of diagnoses) {
    insertDiagnosis.run(dg.id, dg.eventId, dg.type, dg.trigger, dg.triggerRef, dg.blocker, dg.nextAction, dg.nextMaterial)
  }

  const insertDispute = d.prepare(`
    INSERT INTO disputes (id, bill_id, reason, reporter, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  insertDispute.run('dis-001', 'bill-006', '优先级评分95分与出票人格力电器B+评级不匹配，疑似插队', '刘复核', 'open', '2026-05-19 11:01:00')
}
