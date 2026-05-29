import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status, customerName, platformName, dateFrom, dateTo } = req.query

  let sql = `
    SELECT DISTINCT rc.* FROM refund_cases rc
  `
  const params: unknown[] = []
  const conditions: string[] = []

  if (platformName) {
    sql += ` LEFT JOIN installment_contracts ic ON rc.id = ic.refund_case_id`
    conditions.push(`ic.platform_name LIKE ?`)
    params.push(`%${platformName}%`)
  }

  if (status) {
    conditions.push(`rc.status = ?`)
    params.push(status)
  }
  if (customerName) {
    conditions.push(`rc.customer_name LIKE ?`)
    params.push(`%${customerName}%`)
  }
  if (dateFrom) {
    conditions.push(`rc.created_at >= ?`)
    params.push(dateFrom)
  }
  if (dateTo) {
    conditions.push(`rc.created_at <= ?`)
    params.push(dateTo)
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ')
  }

  sql += ` ORDER BY rc.created_at DESC`

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id) as Record<string, any> | undefined
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const contracts = db.prepare(`SELECT * FROM installment_contracts WHERE refund_case_id = ? ORDER BY import_order`).all(id)
  const treatments = db.prepare(`SELECT * FROM treatment_records WHERE refund_case_id = ? ORDER BY import_order`).all(id)
  const coupons = db.prepare(`SELECT * FROM coupons WHERE refund_case_id = ? ORDER BY import_order`).all(id)
  const pendingItems = db.prepare(`SELECT * FROM pending_items WHERE refund_case_id = ? ORDER BY created_at`).all(id)
  const statusLogs = db.prepare(`SELECT * FROM platform_status_logs WHERE refund_case_id = ? ORDER BY changed_at`).all(id)
  const operationLogs = db.prepare(`SELECT * FROM operation_logs WHERE refund_case_id = ? ORDER BY created_at`).all(id)

  res.json({
    success: true,
    data: {
      ...caseRow,
      contracts,
      treatments,
      coupons,
      pendingItems,
      statusLogs,
      operationLogs,
    },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { customerName, totalAmount } = req.body

  if (!customerName) {
    res.status(400).json({ success: false, error: '客户姓名不能为空' })
    return
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO refund_cases (id, customer_name, total_amount)
    VALUES (?, ?, ?)
  `).run(id, customerName, totalAmount || 0)

  const row = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const { customerName, totalAmount, status } = req.body

  const existing = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (customerName !== undefined) {
    updates.push(`customer_name = ?`)
    params.push(customerName)
  }
  if (totalAmount !== undefined) {
    updates.push(`total_amount = ?`)
    params.push(totalAmount)
  }
  if (status !== undefined) {
    updates.push(`status = ?`)
    params.push(status)
  }

  if (updates.length === 0) {
    res.json({ success: true, data: existing })
    return
  }

  updates.push(`updated_at = datetime('now','localtime')`)
  params.push(id)

  db.prepare(`UPDATE refund_cases SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const row = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const { id } = req.params

  const existing = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  db.prepare(`DELETE FROM refund_cases WHERE id = ?`).run(id)
  res.json({ success: true, message: '删除成功' })
})

router.post('/:id/calculate', (req: Request, res: Response): void => {
  const { id } = req.params

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id) as any
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const treatments = db.prepare(`SELECT * FROM treatment_records WHERE refund_case_id = ?`).all(id) as any[]
  if (treatments.length === 0) {
    res.json({ success: false, intercepted: true, message: '未录入疗程记录，无法计算' })
    return
  }

  const contracts = db.prepare(`SELECT * FROM installment_contracts WHERE refund_case_id = ?`).all(id) as any[]
  const coupons = db.prepare(`SELECT * FROM coupons WHERE refund_case_id = ?`).all(id) as any[]

  const treatmentConsumed = treatments.reduce((sum: number, t: any) => sum + t.consumed_amount, 0)
  const totalPaid = contracts.reduce((sum: number, c: any) => sum + c.paid_amount, 0)

  const refundBase = caseRow.total_amount - treatmentConsumed
  const platformRefund = Math.min(totalPaid, Math.max(0, refundBase))
  const storeRefund = Math.max(0, refundBase - platformRefund)

  const transaction = db.transaction(() => {
    db.prepare(`
      DELETE FROM pending_items WHERE refund_case_id = ? AND status = '待确认'
    `).run(id)

    const insertPending = db.prepare(`
      INSERT INTO pending_items (id, refund_case_id, type, source_name, amount)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const contract of contracts) {
      if (contract.platform_fee > 0) {
        insertPending.run(uuidv4(), id, '平台手续费', contract.platform_name, contract.platform_fee)
      }
    }

    for (const coupon of coupons) {
      if (coupon.is_recoverable === 1) {
        insertPending.run(uuidv4(), id, '优惠券追回', coupon.coupon_name, coupon.coupon_amount)
      }
    }

    db.prepare(`
      UPDATE refund_cases
      SET treatment_consumed = ?, platform_refund = ?, store_refund = ?, status = '待确认', updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(treatmentConsumed, platformRefund, storeRefund, id)

    db.prepare(`
      INSERT INTO operation_logs (id, refund_case_id, action, detail)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), id, '拆账计算', `疗程消耗: ${treatmentConsumed}, 平台应退: ${platformRefund}, 门店应退: ${storeRefund}`)
  })

  transaction()

  const updated = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id)
  res.json({ success: true, data: updated })
})

router.put('/:id/platform-status', (req: Request, res: Response): void => {
  const { id } = req.params
  const { platformStatus } = req.body

  if (!platformStatus) {
    res.status(400).json({ success: false, error: '平台状态不能为空' })
    return
  }

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id) as any
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const contracts = db.prepare(`SELECT * FROM installment_contracts WHERE refund_case_id = ?`).all(id) as any[]

  const transaction = db.transaction(() => {
    const insertLog = db.prepare(`
      INSERT INTO platform_status_logs (id, refund_case_id, from_status, to_status)
      VALUES (?, ?, ?, ?)
    `)

    for (const contract of contracts) {
      const fromStatus = contract.platform_status
      if (fromStatus !== platformStatus) {
        db.prepare(`UPDATE installment_contracts SET platform_status = ? WHERE id = ?`).run(platformStatus, contract.id)
        insertLog.run(uuidv4(), id, fromStatus, platformStatus)
      }
    }
  })

  transaction()

  const updatedContracts = db.prepare(`SELECT * FROM installment_contracts WHERE refund_case_id = ? ORDER BY import_order`).all(id)
  res.json({ success: true, data: updatedContracts })
})

router.get('/:id/logs', (req: Request, res: Response): void => {
  const { id } = req.params

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id)
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const logs = db.prepare(`SELECT * FROM operation_logs WHERE refund_case_id = ? ORDER BY created_at DESC`).all(id)
  res.json({ success: true, data: logs })
})

export default router
