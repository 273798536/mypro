import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.post('/contracts', (req: Request, res: Response): void => {
  const { refundCaseId, contracts } = req.body

  if (!refundCaseId || !Array.isArray(contracts) || contracts.length === 0) {
    res.status(400).json({ success: false, error: '参数无效' })
    return
  }

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(refundCaseId)
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const maxOrder = db.prepare(
    `SELECT COALESCE(MAX(import_order), 0) as max_order FROM installment_contracts WHERE refund_case_id = ?`
  ).get(refundCaseId) as any

  const insertStmt = db.prepare(`
    INSERT INTO installment_contracts (id, refund_case_id, platform_name, contract_amount, paid_amount, platform_fee, platform_status, import_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    let order = maxOrder.max_order
    for (const contract of contracts) {
      order++
      insertStmt.run(
        uuidv4(),
        refundCaseId,
        contract.platformName,
        contract.contractAmount || 0,
        contract.paidAmount || 0,
        contract.platformFee || 0,
        contract.platformStatus || '未结清',
        order
      )
    }
  })

  transaction()

  const inserted = db.prepare(`SELECT COUNT(*) as count FROM installment_contracts WHERE refund_case_id = ?`).get(refundCaseId) as any
  res.status(201).json({ success: true, data: { count: contracts.length, ...inserted } })
})

router.post('/treatments', (req: Request, res: Response): void => {
  const { refundCaseId, treatments } = req.body

  if (!refundCaseId || !Array.isArray(treatments) || treatments.length === 0) {
    res.status(400).json({ success: false, error: '参数无效' })
    return
  }

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(refundCaseId)
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const maxOrder = db.prepare(
    `SELECT COALESCE(MAX(import_order), 0) as max_order FROM treatment_records WHERE refund_case_id = ?`
  ).get(refundCaseId) as any

  const insertStmt = db.prepare(`
    INSERT INTO treatment_records (id, refund_case_id, treatment_name, session_count, completed_sessions, unit_price, consumed_amount, import_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    let order = maxOrder.max_order
    for (const treatment of treatments) {
      order++
      const consumedAmount = (treatment.completedSessions || 0) * (treatment.unitPrice || 0)
      insertStmt.run(
        uuidv4(),
        refundCaseId,
        treatment.treatmentName,
        treatment.sessionCount || 0,
        treatment.completedSessions || 0,
        treatment.unitPrice || 0,
        consumedAmount,
        order
      )
    }
  })

  transaction()

  res.status(201).json({ success: true, data: { count: treatments.length } })
})

router.post('/coupons', (req: Request, res: Response): void => {
  const { refundCaseId, coupons } = req.body

  if (!refundCaseId || !Array.isArray(coupons) || coupons.length === 0) {
    res.status(400).json({ success: false, error: '参数无效' })
    return
  }

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(refundCaseId)
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const hasExisting = db.prepare(
    `SELECT 1 FROM installment_contracts WHERE refund_case_id = ? UNION ALL SELECT 1 FROM treatment_records WHERE refund_case_id = ? LIMIT 1`
  ).get(refundCaseId, refundCaseId)

  const maxOrder = db.prepare(
    `SELECT COALESCE(MAX(import_order), 0) as max_order FROM coupons WHERE refund_case_id = ?`
  ).get(refundCaseId) as any

  const insertStmt = db.prepare(`
    INSERT INTO coupons (id, refund_case_id, coupon_name, coupon_amount, is_recoverable, is_late_entry, import_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const logStmt = db.prepare(`
    INSERT INTO operation_logs (id, refund_case_id, action, detail)
    VALUES (?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    let order = maxOrder.max_order
    for (const coupon of coupons) {
      order++
      const isLateEntry = hasExisting ? 1 : (coupon.isLateEntry || 0)
      insertStmt.run(
        uuidv4(),
        refundCaseId,
        coupon.couponName,
        coupon.couponAmount || 0,
        coupon.isRecoverable || 0,
        isLateEntry,
        order
      )
    }
    logStmt.run(uuidv4(), refundCaseId, '导入优惠券', `导入了 ${coupons.length} 条优惠券记录`)
  })

  transaction()

  res.status(201).json({ success: true, data: { count: coupons.length } })
})

export default router
