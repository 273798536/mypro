import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dataDir = join(__dirname, '..', 'data')
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const dbPath = join(dataDir, 'loan-extension.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    contract_no TEXT NOT NULL UNIQUE,
    borrower_name TEXT NOT NULL,
    borrower_id TEXT NOT NULL,
    amount REAL NOT NULL,
    term TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    rate REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guarantees (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    guarantor_name TEXT NOT NULL,
    guarantor_id TEXT NOT NULL,
    guarantee_type TEXT NOT NULL,
    guarantee_amount REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_expired INTEGER NOT NULL DEFAULT 0,
    source_person TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS repayment_records (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    period INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    actual_date TEXT,
    amount REAL NOT NULL,
    principal REAL NOT NULL,
    interest REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    is_extension_node INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS extension_applications (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    extension_no INTEGER NOT NULL DEFAULT 1,
    original_end_date TEXT NOT NULL,
    new_end_date TEXT NOT NULL,
    extension_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL,
    submitted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    extension_id TEXT NOT NULL REFERENCES extension_applications(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    source_person TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS risk_flags (
    id TEXT PRIMARY KEY,
    extension_id TEXT NOT NULL REFERENCES extension_applications(id),
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    related_entity_id TEXT,
    detected_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS approval_records (
    id TEXT PRIMARY KEY,
    extension_id TEXT NOT NULL REFERENCES extension_applications(id),
    approver_name TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    action TEXT NOT NULL,
    opinion TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_immutable INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS approval_influences (
    id TEXT PRIMARY KEY,
    approval_id TEXT NOT NULL REFERENCES approval_records(id),
    influenced_by_approval_id TEXT NOT NULL REFERENCES approval_records(id)
  );
`)

const countRow = db.prepare('SELECT COUNT(*) as cnt FROM contracts').get() as { cnt: number }
if (countRow.cnt === 0) {
  seedData()
}

function seedData() {
  const now = new Date().toISOString()

  const insertContract = db.prepare(`
    INSERT INTO contracts (id, contract_no, borrower_name, borrower_id, amount, term, start_date, end_date, rate, status, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertGuarantee = db.prepare(`
    INSERT INTO guarantees (id, contract_id, guarantor_name, guarantor_id, guarantee_type, guarantee_amount, start_date, end_date, is_expired, source_person, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertRepayment = db.prepare(`
    INSERT INTO repayment_records (id, contract_id, period, due_date, actual_date, amount, principal, interest, status, is_extension_node)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertExtension = db.prepare(`
    INSERT INTO extension_applications (id, contract_id, extension_no, original_end_date, new_end_date, extension_reason, status, created_at, created_by, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMaterial = db.prepare(`
    INSERT INTO materials (id, extension_id, name, type, category, source_person, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertRiskFlag = db.prepare(`
    INSERT INTO risk_flags (id, extension_id, type, severity, description, related_entity_id, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertApproval = db.prepare(`
    INSERT INTO approval_records (id, extension_id, approver_name, approver_role, action, opinion, created_at, is_immutable)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertInfluence = db.prepare(`
    INSERT INTO approval_influences (id, approval_id, influenced_by_approval_id)
    VALUES (?, ?, ?)
  `)

  const seed = db.transaction(() => {
    // === Contract 1: 张伟 - 3次展期（重复展期场景）===
    const c1Id = 'c1-aaaa-bbbb-cccc'
    insertContract.run(c1Id, 'HT-2024-001', '张伟', '110101199001011234', 500000, '12个月', '2024-01-15', '2025-01-15', 4.35, 'active', now, '系统管理员')
    insertGuarantee.run('g1-aaaa', c1Id, '赵六', '310101198505052345', '连带责任', 500000, '2024-01-15', '2026-01-15', 0, '张伟', now)

    // 还款记录 - 前6期已还，后6期未还
    for (let i = 1; i <= 12; i++) {
      const dueDate = `2024-${String(i + 1).padStart(2, '0')}-15`
      if (i <= 6) {
        insertRepayment.run(`r1-${i}`, c1Id, i, dueDate, i < 6 ? dueDate : '2024-07-20', 43500, 41666.67, 1833.33, 'paid', 0)
      } else {
        insertRepayment.run(`r1-${i}`, c1Id, i, dueDate, null, 43500, 41666.67, 1833.33, 'overdue', 0)
      }
    }

    // 展期1 - 已批准
    const e1Id = 'e1-aaaa-bbbb'
    insertExtension.run(e1Id, c1Id, 1, '2025-01-15', '2025-07-15', '企业经营困难，资金周转紧张，申请展期6个月', 'approved', '2024-12-20T10:00:00.000Z', '系统管理员', '2024-12-20T10:00:00.000Z')
    insertMaterial.run('m1-aa', e1Id, '企业经营困难证明', 'pdf', '申请材料', '张伟', now)
    insertMaterial.run('m1-ab', e1Id, '财务报表', 'pdf', '申请材料', '张伟', now)
    insertApproval.run('a1-aa', e1Id, '王经理', '客户经理', 'approve', '情况属实，建议批准', '2024-12-22T14:00:00.000Z', 1)

    // 展期2 - 已批准
    const e2Id = 'e2-aaaa-bbbb'
    insertExtension.run(e2Id, c1Id, 2, '2025-07-15', '2026-01-15', '市场环境持续低迷，企业仍未恢复正常经营', 'approved', '2025-06-10T09:00:00.000Z', '系统管理员', '2025-06-10T09:00:00.000Z')
    insertMaterial.run('m2-aa', e2Id, '经营困难延续证明', 'pdf', '申请材料', '张伟', now)
    insertMaterial.run('m2-ab', e2Id, '最新财务报表', 'pdf', '申请材料', '张伟', now)
    insertApproval.run('a2-aa', e2Id, '王经理', '客户经理', 'approve', '持续困难，建议批准', '2025-06-12T10:00:00.000Z', 1)
    insertApproval.run('a2-ab', e2Id, '李总监', '风控总监', 'approve', '风险可控，同意展期', '2025-06-13T15:00:00.000Z', 1)
    insertInfluence.run('inf-1', 'a2-ab', 'a2-aa')

    // 展期3 - 待审批（触发重复展期风险）
    const e3Id = 'e3-aaaa-bbbb'
    insertExtension.run(e3Id, c1Id, 3, '2026-01-15', '2026-07-15', '企业仍未恢复，需再次展期', 'submitted', '2025-12-01T08:00:00.000Z', '系统管理员', '2025-12-01T08:00:00.000Z')
    insertMaterial.run('m3-aa', e3Id, '第三次展期申请说明', 'pdf', '申请材料', '张伟', now)
    insertRiskFlag.run('rf3-aa', e3Id, 'repeated_extension', 'high', '该合同已展期2次，本次为第3次展期，重复展期风险高', c1Id, now)

    // === Contract 2: 李娜 - 逾期覆盖场景 ===
    const c2Id = 'c2-dddd-eeee-ffff'
    insertContract.run(c2Id, 'HT-2024-002', '李娜', '320102198803033456', 300000, '6个月', '2024-06-01', '2024-12-01', 4.75, 'overdue', now, '系统管理员')
    insertGuarantee.run('g2-aaaa', c2Id, '孙七', '320102197606064567', '一般保证', 300000, '2024-06-01', '2025-12-01', 0, '李娜', now)

    // 还款记录 - 全部逾期
    for (let i = 1; i <= 6; i++) {
      const dueDate = `2024-${String(i + 5).padStart(2, '0')}-01`
      if (i <= 3) {
        insertRepayment.run(`r2-${i}`, c2Id, i, dueDate, '2024-12-15', 55000, 50000, 5000, 'paid', 0)
      } else {
        insertRepayment.run(`r2-${i}`, c2Id, i, dueDate, null, 55000, 50000, 5000, 'overdue', 0)
      }
    }

    // 展期申请 - 展期起始日期与逾期期间重叠
    const e4Id = 'e4-cccc-dddd'
    insertExtension.run(e4Id, c2Id, 1, '2024-12-01', '2025-06-01', '个人收入减少，暂时无法按期还款', 'submitted', '2024-11-25T09:00:00.000Z', '系统管理员', '2024-11-25T09:00:00.000Z')
    insertMaterial.run('m4-aa', e4Id, '收入减少证明', 'pdf', '申请材料', '李娜', now)
    insertMaterial.run('m4-ab', e4Id, '还款计划调整方案', 'docx', '申请材料', '李娜', now)
    insertRiskFlag.run('rf4-aa', e4Id, 'overdue_covering', 'high', '展期起始日期2024-12-01与逾期期间重叠，存在逾期覆盖风险', c2Id, now)
    insertRiskFlag.run('rf4-ab', e4Id, 'repeated_extension', 'low', '该合同第1次展期', c2Id, now)

    // === Contract 3: 王强 - 担保过期场景 ===
    const c3Id = 'c3-gggg-hhhh-iiii'
    insertContract.run(c3Id, 'HT-2024-003', '王强', '440103199205055678', 800000, '24个月', '2024-03-01', '2026-03-01', 4.50, 'active', now, '系统管理员')
    insertGuarantee.run('g3-aaaa', c3Id, '周八', '440103198012126789', '连带责任', 800000, '2024-03-01', '2025-09-01', 1, '王强', now)
    insertGuarantee.run('g3-bbbb', c3Id, '吴九', '440103197508087890', '抵押', 600000, '2024-03-01', '2025-06-01', 1, '王强', now)

    // 还款记录
    for (let i = 1; i <= 8; i++) {
      const month = i + 2
      const year = month > 12 ? 2025 : 2024
      const m = month > 12 ? month - 12 : month
      const dueDate = `${year}-${String(m).padStart(2, '0')}-01`
      insertRepayment.run(`r3-${i}`, c3Id, i, dueDate, dueDate, 36666.67, 33333.33, 3333.34, 'paid', 0)
    }
    for (let i = 9; i <= 16; i++) {
      const month = i + 2
      const year = month > 12 ? 2025 : 2024
      const m = month > 12 ? month - 12 : month
      const dueDate = `${year}-${String(m).padStart(2, '0')}-01`
      insertRepayment.run(`r3-${i}`, c3Id, i, dueDate, null, 36666.67, 33333.33, 3333.34, 'pending', 0)
    }

    // 展期申请 - 新结束日期超出担保结束日期
    const e5Id = 'e5-cccc-dddd'
    insertExtension.run(e5Id, c3Id, 1, '2026-03-01', '2026-12-01', '项目回款延迟，需延长还款期限', 'submitted', '2025-11-15T10:00:00.000Z', '系统管理员', '2025-11-15T10:00:00.000Z')
    insertMaterial.run('m5-aa', e5Id, '项目回款延迟说明', 'pdf', '申请材料', '王强', now)
    insertMaterial.run('m5-ab', e5Id, '担保人同意书', 'pdf', '担保材料', '周八', now)
    insertRiskFlag.run('rf5-aa', e5Id, 'guarantee_expired', 'high', '新展期结束日期2026-12-01超出担保人周八的担保结束日期2025-09-01', 'g3-aaaa', now)
    insertRiskFlag.run('rf5-ab', e5Id, 'guarantee_expired', 'medium', '新展期结束日期2026-12-01超出担保人吴九的担保结束日期2025-06-01', 'g3-bbbb', now)

    // === Contract 4: 刘芳 - 正常展期，已批准 ===
    const c4Id = 'c4-jjjj-kkkk-llll'
    insertContract.run(c4Id, 'HT-2025-004', '刘芳', '500104199107078901', 200000, '6个月', '2025-01-10', '2025-07-10', 4.25, 'active', now, '系统管理员')
    insertGuarantee.run('g4-aaaa', c4Id, '郑十', '500104198302029012', '连带责任', 200000, '2025-01-10', '2026-07-10', 0, '刘芳', now)

    for (let i = 1; i <= 6; i++) {
      const dueDate = `2025-${String(i).padStart(2, '0')}-10`
      if (i <= 3) {
        insertRepayment.run(`r4-${i}`, c4Id, i, dueDate, dueDate, 35416.67, 33333.33, 2083.34, 'paid', 0)
      } else {
        insertRepayment.run(`r4-${i}`, c4Id, i, dueDate, null, 35416.67, 33333.33, 2083.34, 'pending', 0)
      }
    }

    const e6Id = 'e6-cccc-dddd'
    insertExtension.run(e6Id, c4Id, 1, '2025-07-10', '2026-01-10', '短期资金周转困难，申请展期6个月', 'approved', '2025-05-20T09:00:00.000Z', '系统管理员', '2025-05-20T09:00:00.000Z')
    insertMaterial.run('m6-aa', e6Id, '资金周转困难说明', 'pdf', '申请材料', '刘芳', now)
    insertApproval.run('a6-aa', e6Id, '王经理', '客户经理', 'approve', '情况合理，建议批准', '2025-05-22T11:00:00.000Z', 1)
    insertApproval.run('a6-ab', e6Id, '李总监', '风控总监', 'approve', '同意', '2025-05-23T16:00:00.000Z', 1)
    insertInfluence.run('inf-2', 'a6-ab', 'a6-aa')

    // === Contract 5: 陈明 - 草稿状态展期 ===
    const c5Id = 'c5-mmmm-nnnn-oooo'
    insertContract.run(c5Id, 'HT-2025-005', '陈明', '610105199309091234', 150000, '3个月', '2025-03-01', '2025-06-01', 4.00, 'active', now, '系统管理员')
    insertGuarantee.run('g5-aaaa', c5Id, '黄十一', '610105198704045678', '一般保证', 150000, '2025-03-01', '2026-03-01', 0, '陈明', now)

    for (let i = 1; i <= 3; i++) {
      const dueDate = `2025-${String(i + 2).padStart(2, '0')}-01`
      if (i <= 1) {
        insertRepayment.run(`r5-${i}`, c5Id, i, dueDate, dueDate, 51666.67, 50000, 1666.67, 'paid', 0)
      } else {
        insertRepayment.run(`r5-${i}`, c5Id, i, dueDate, null, 51666.67, 50000, 1666.67, 'overdue', 0)
      }
    }

    const e7Id = 'e7-cccc-dddd'
    insertExtension.run(e7Id, c5Id, 1, '2025-06-01', '2025-12-01', '临时资金周转困难', 'draft', now, '系统管理员', null)
    insertMaterial.run('m7-aa', e7Id, '展期申请书', 'docx', '申请材料', '陈明', now)
  })

  seed()
  console.log('Seed data inserted successfully')
}

export default db
