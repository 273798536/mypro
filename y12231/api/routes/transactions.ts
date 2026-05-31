import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { type, memberId, petId, isBackfilled, startDate, endDate, page = '1', pageSize = '20' } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (type) { where += ' AND t.type = ?'; params.push(type) }
  if (memberId) { where += ' AND t.member_id = ?'; params.push(memberId) }
  if (petId) { where += ' AND t.pet_id = ?'; params.push(petId) }
  if (isBackfilled !== undefined) { where += ' AND t.is_backfilled = ?'; params.push(Number(isBackfilled)) }
  if (startDate) { where += ' AND t.created_at >= ?'; params.push(startDate) }
  if (endDate) { where += ' AND t.created_at <= ?'; params.push(endDate) }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM transactions t ${where}`).get(...params) as any
  const transactions = db.prepare(
    `SELECT t.*, m.name as member_name, p.name as pet_name, pk.name as package_name FROM transactions t LEFT JOIN member_accounts m ON t.member_id = m.id LEFT JOIN pet_profiles p ON t.pet_id = p.id LEFT JOIN packages pk ON t.package_id = pk.id ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset)

  res.json({
    success: true,
    data: { list: transactions, total: total.cnt, page: Number(page), pageSize: Number(pageSize) },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { memberId, petId, packageId, amount, type } = req.body

  if (!memberId || !type || amount === undefined) {
    res.status(400).json({ success: false, error: '会员ID、类型和金额必填' })
    return
  }

  if (!['consumption', 'recharge', 'refund'].includes(type)) {
    res.status(400).json({ success: false, error: '类型只能为consumption/recharge/refund' })
    return
  }

  const member = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(memberId) as any
  if (!member) {
    res.status(404).json({ success: false, error: '会员不存在' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const transactionId = uuidv4()
  let isDuplicate = false

  if (type === 'consumption' && packageId) {
    const pkg = db.prepare(`SELECT * FROM packages WHERE id = ?`).get(packageId) as any
    if (!pkg) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }
    if (pkg.status === 'expired') {
      res.status(400).json({ success: false, error: '套餐已过期' })
      return
    }
    if (pkg.status === 'exhausted' || pkg.remaining_deductions <= 0) {
      res.status(400).json({ success: false, error: '套餐次数已用完' })
      return
    }
    if (pkg.member_id !== memberId) {
      res.status(400).json({ success: false, error: '套餐不属于该会员' })
      return
    }

    const today = now.slice(0, 10)
    const existingDeduction = db.prepare(
      `SELECT dd.id FROM deduction_details dd JOIN transactions t ON dd.transaction_id = t.id WHERE dd.package_id = ? AND t.pet_id = ? AND date(t.created_at) = date(?) AND dd.status = 'normal'`
    ).get(packageId, petId, now)

    if (existingDeduction) {
      isDuplicate = true
    }
  }

  const affectedDetailIds: string[] = []

  db.prepare(
    `INSERT INTO transactions (id, member_id, pet_id, package_id, amount, type, is_backfilled, affected_detail_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(transactionId, memberId, petId || null, packageId || null, amount, type, JSON.stringify(affectedDetailIds), now)

  if (type === 'consumption' && packageId) {
    const pkg = db.prepare(`SELECT * FROM packages WHERE id = ?`).get(packageId) as any
    const deductionId = uuidv4()
    const newRemaining = pkg.remaining_deductions - 1
    const deductionStatus = isDuplicate ? 'duplicate' : 'normal'

    db.prepare(
      `INSERT INTO deduction_details (id, transaction_id, package_id, deduction_count, remaining_count, status, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)`
    ).run(deductionId, transactionId, packageId, newRemaining, deductionStatus, now)

    db.prepare(
      `UPDATE packages SET used_deductions = used_deductions + 1, remaining_deductions = remaining_deductions - 1, status = CASE WHEN remaining_deductions - 1 <= 0 THEN 'exhausted' ELSE status END WHERE id = ?`
    ).run(packageId)

    affectedDetailIds.push(deductionId)
    db.prepare(`UPDATE transactions SET affected_detail_ids = ? WHERE id = ?`).run(JSON.stringify(affectedDetailIds), transactionId)

    if (isDuplicate) {
      const exceptionId = uuidv4()
      const petName = petId ? (db.prepare(`SELECT name FROM pet_profiles WHERE id = ?`).get(petId) as any)?.name : '未知'
      db.prepare(
        `INSERT INTO exception_items (id, type, severity, related_member_id, related_pet_id, related_transaction_id, description, status, created_at) VALUES (?, 'duplicate_deduction', 'critical', ?, ?, ?, ?, 'pending', ?)`
      ).run(exceptionId, memberId, petId, transactionId, `${petName}疑似重复扣款，同套餐同日已存在正常扣款记录`, now)
    }
  }

  if (type === 'recharge') {
    db.prepare(`UPDATE member_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?`).run(amount, now, memberId)
  } else if (type === 'refund') {
    db.prepare(`UPDATE member_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?`).run(Math.abs(amount), now, memberId)
  } else if (type === 'consumption') {
    db.prepare(`UPDATE member_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?`).run(amount, now, memberId)
  }

  const transaction = db.prepare(
    `SELECT t.*, m.name as member_name, p.name as pet_name, pk.name as package_name FROM transactions t LEFT JOIN member_accounts m ON t.member_id = m.id LEFT JOIN pet_profiles p ON t.pet_id = p.id LEFT JOIN packages pk ON t.package_id = pk.id WHERE t.id = ?`
  ).get(transactionId)

  res.json({ success: true, data: transaction })
})

router.post('/backfill', (req: Request, res: Response): void => {
  const { memberId, petId, packageId, amount, backfillNote, originalDate } = req.body

  if (!memberId || !amount || !originalDate) {
    res.status(400).json({ success: false, error: '会员ID、金额和原始日期必填' })
    return
  }

  const member = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(memberId) as any
  if (!member) {
    res.status(404).json({ success: false, error: '会员不存在' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const transactionId = uuidv4()
  const affectedDetailIds: string[] = []

  db.prepare(
    `INSERT INTO transactions (id, member_id, pet_id, package_id, amount, type, is_backfilled, backfill_note, backfilled_at, affected_detail_ids, created_at) VALUES (?, ?, ?, ?, ?, 'consumption', 1, ?, ?, '[]', ?)`
  ).run(transactionId, memberId, petId || null, packageId || null, amount, backfillNote || null, now, originalDate)

  if (packageId) {
    const pkg = db.prepare(`SELECT * FROM packages WHERE id = ?`).get(packageId) as any
    if (pkg) {
      const deductionId = uuidv4()
      const newRemaining = Math.max(0, pkg.remaining_deductions - 1)
      db.prepare(
        `INSERT INTO deduction_details (id, transaction_id, package_id, deduction_count, remaining_count, status, created_at) VALUES (?, ?, ?, 1, ?, 'normal', ?)`
      ).run(deductionId, transactionId, packageId, newRemaining, originalDate)

      db.prepare(
        `UPDATE packages SET used_deductions = used_deductions + 1, remaining_deductions = remaining_deductions - 1, status = CASE WHEN remaining_deductions - 1 <= 0 THEN 'exhausted' ELSE status END WHERE id = ?`
      ).run(packageId)

      const affectedDetails = db.prepare(
        `SELECT id FROM deduction_details WHERE package_id = ? AND transaction_id != ? AND datetime(created_at) > datetime(?) AND backfill_affected = 0`
      ).all(packageId, transactionId, originalDate) as any[]

      for (const ad of affectedDetails) {
        db.prepare(
          `UPDATE deduction_details SET backfill_affected = 1, backfill_source_transaction_id = ? WHERE id = ?`
        ).run(transactionId, ad.id)
        affectedDetailIds.push(ad.id)
      }

      db.prepare(`UPDATE transactions SET affected_detail_ids = ? WHERE id = ?`).run(JSON.stringify(affectedDetailIds), transactionId)

      if (affectedDetails.length > 0) {
        const exceptionId = uuidv4()
        db.prepare(
          `INSERT INTO exception_items (id, type, severity, related_member_id, related_pet_id, related_transaction_id, description, status, created_at) VALUES (?, 'backfill_impact', 'warning', ?, ?, ?, ?, 'pending', ?)`
        ).run(exceptionId, memberId, petId || null, transactionId, `补录交易影响${affectedDetails.length}条已有扣款明细`, now)
      }
    }
  }

  db.prepare(`UPDATE member_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?`).run(amount, now, memberId)

  const transaction = db.prepare(
    `SELECT t.*, m.name as member_name, p.name as pet_name, pk.name as package_name FROM transactions t LEFT JOIN member_accounts m ON t.member_id = m.id LEFT JOIN pet_profiles p ON t.pet_id = p.id LEFT JOIN packages pk ON t.package_id = pk.id WHERE t.id = ?`
  ).get(transactionId)

  res.json({ success: true, data: transaction })
})

router.get('/deduction-details', (req: Request, res: Response): void => {
  const { packageId, status, backfillAffected, page = '1', pageSize = '20' } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (packageId) { where += ' AND dd.package_id = ?'; params.push(packageId) }
  if (status) { where += ' AND dd.status = ?'; params.push(status) }
  if (backfillAffected !== undefined) { where += ' AND dd.backfill_affected = ?'; params.push(Number(backfillAffected)) }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM deduction_details dd ${where}`).get(...params) as any
  const details = db.prepare(
    `SELECT dd.*, t.amount as transaction_amount, t.type as transaction_type, t.created_at as transaction_date, p.name as package_name FROM deduction_details dd LEFT JOIN transactions t ON dd.transaction_id = t.id LEFT JOIN packages p ON dd.package_id = p.id ${where} ORDER BY dd.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset)

  res.json({
    success: true,
    data: { list: details, total: total.cnt, page: Number(page), pageSize: Number(pageSize) },
  })
})

router.put('/deduction-details/:id/status', (req: Request, res: Response): void => {
  const detailId = req.params.id
  const { status, manualOverrideBy = '管理员', manualOverrideReason } = req.body

  if (!['normal', 'duplicate', 'expired', 'manual_override'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的状态' })
    return
  }

  const detail = db.prepare(`SELECT * FROM deduction_details WHERE id = ?`).get(detailId) as any
  if (!detail) {
    res.status(404).json({ success: false, error: '扣款明细不存在' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  if (status === 'manual_override') {
    if (!manualOverrideReason) {
      res.status(400).json({ success: false, error: '手动覆盖原因必填' })
      return
    }
    db.prepare(
      `UPDATE deduction_details SET status = ?, original_status = ?, manual_override_by = ?, manual_override_at = ?, manual_override_reason = ? WHERE id = ?`
    ).run(status, detail.status, manualOverrideBy, now, manualOverrideReason, detailId)
  } else {
    db.prepare(
      `UPDATE deduction_details SET status = ? WHERE id = ?`
    ).run(status, detailId)
  }

  const logId = uuidv4()
  db.prepare(
    `INSERT INTO operation_logs (id, operator, action, target_type, target_id, old_value, new_value, note, created_at) VALUES (?, ?, 'manual_override', 'deduction_detail', ?, ?, ?, ?, ?)`
  ).run(logId, manualOverrideBy, detailId, detail.status, status, manualOverrideReason || `状态从${detail.status}变更为${status}`, now)

  const updated = db.prepare(`SELECT * FROM deduction_details WHERE id = ?`).get(detailId)
  res.json({ success: true, data: updated })
})

export default router
