import { getDb } from './db.js'
import { initDatabase } from './migrate.js'

function seedData(): void {
  const db = getDb()

  const count = db.prepare('SELECT COUNT(*) as cnt FROM suppliers').get() as { cnt: number }
  if (count.cnt > 0) return

  const today = new Date()
  const dateStr = (d: Date) => d.toISOString().slice(0, 10)
  const addDays = (d: Date, n: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (id, name, qualification_status, contact_person, contact_phone, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertContract = db.prepare(`
    INSERT INTO contracts (id, contract_no, supplier_id, guarantee_no, guarantee_amount, guarantee_expiry_date, quota_used, quota_total, quota_manually_modified, extend_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertWarning = db.prepare(`
    INSERT INTO warnings (id, contract_id, level, status, confirmed_by, confirmed_at, remark, remark_modified_by, remark_modified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertHistory = db.prepare(`
    INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertQuotaMod = db.prepare(`
    INSERT INTO quota_modifications (id, contract_id, before_amount, after_amount, reason, operator)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    insertSupplier.run('S001', '中建三局钢结构有限公司', 'valid', '张伟', '13800001111', '武汉市洪山区光谷大道88号')
    insertSupplier.run('S002', '华东建材集团', 'valid', null, '13900002222', '上海市浦东新区张江路100号')
    insertSupplier.run('S003', '深圳鑫达机电工程公司', 'expired', '王强', null, null)
    insertSupplier.run('S004', '北京恒通防水科技', 'valid', '李明', '13700004444', null)
    insertSupplier.run('S005', '浙江远大管业股份', 'valid', null, null, '杭州市余杭区仓前街道')

    insertContract.run('C001', 'CG-2025-001', 'S001', 'BG-2025-S001', 500000, dateStr(addDays(today, 5)), 300000, 500000, 0, 0)
    insertContract.run('C002', 'CG-2025-002', 'S002', 'BG-2025-S002', 800000, dateStr(addDays(today, -3)), 600000, 800000, 0, 1)
    insertContract.run('C003', 'CG-2025-003', 'S003', null, null, null, 200000, 200000, 0, 0)
    insertContract.run('C004', 'CG-2025-004', 'S004', 'BG-2025-S004', 300000, dateStr(addDays(today, 20)), 150000, 300000, 1, 0)
    insertContract.run('C005', 'CG-2025-005', 'S001', 'BG-2025-S005', 1000000, dateStr(addDays(today, -10)), 700000, 1000000, 1, 2)
    insertContract.run('C006', 'CG-2025-006', 'S005', 'BG-2025-S006', 450000, dateStr(addDays(today, 12)), 200000, 450000, 0, 0)
    insertContract.run('C007', 'CG-2025-007', 'S002', 'BG-2025-S007', 650000, dateStr(addDays(today, -1)), 400000, 650000, 0, 0)

    insertWarning.run('W001', 'C001', 'urgent', 'pending', null, null, null, null, null)
    insertWarning.run('W002', 'C002', 'expired', 'pending', null, null, '供应商已通知续保中', '陈经理', dateStr(addDays(today, -1)))
    insertWarning.run('W003', 'C003', 'expired', 'confirmed', '刘经理', dateStr(addDays(today, -5)), '无保函，需补办', null, null)
    insertWarning.run('W004', 'C004', 'warning', 'pending', null, null, null, null, null)
    insertWarning.run('W005', 'C005', 'expired', 'pending', null, null, '多次延期，风险较高', '陈经理', dateStr(addDays(today, -2)))
    insertWarning.run('W006', 'C006', 'warning', 'pending', null, null, null, null, null)
    insertWarning.run('W007', 'C007', 'expired', 'pending', null, null, null, null, null)

    insertHistory.run('H001', 'warning', 'W002', 'remark_modify', '陈经理', null, '供应商已通知续保中', '修改预警备注')
    insertHistory.run('H002', 'warning', 'W003', 'confirm', '刘经理', 'pending', 'confirmed', '确认预警：无保函需补办')
    insertHistory.run('H003', 'warning', 'W005', 'remark_modify', '陈经理', null, '多次延期，风险较高', '修改预警备注')
    insertHistory.run('H004', 'contract', 'C002', 'extend', '张主管', null, '延期30天', '合同延期：保函尚未过期时延期')
    insertHistory.run('H005', 'contract', 'C005', 'extend', '张主管', null, '延期60天', '合同第1次延期')
    insertHistory.run('H006', 'contract', 'C005', 'extend', '张主管', null, '延期30天', '合同第2次延期')
    insertHistory.run('H007', 'contract', 'C004', 'quota_modify', '李主管', '150000', '280000', '额度占用由15万调整为28万')
    insertHistory.run('H008', 'contract', 'C005', 'quota_modify', '陈经理', '700000', '550000', '额度占用由70万调整为55万')

    insertQuotaMod.run('QM001', 'C004', 150000, 280000, '项目追加预算', '李主管')
    insertQuotaMod.run('QM002', 'C005', 700000, 550000, '部分工程量核减', '陈经理')
  })

  transaction()
}

export function setupDatabase(): void {
  initDatabase()
  seedData()
}
