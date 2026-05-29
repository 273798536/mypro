import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { type, status, refundCaseId } = req.query

  const conditions: string[] = []
  const params: unknown[] = []

  if (type) {
    conditions.push(`type = ?`)
    params.push(type)
  }
  if (status) {
    conditions.push(`status = ?`)
    params.push(status)
  }
  if (refundCaseId) {
    conditions.push(`refund_case_id = ?`)
    params.push(refundCaseId)
  }

  let sql = `SELECT * FROM pending_items`
  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ')
  }
  sql += ` ORDER BY created_at DESC`

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.put('/:id/confirm', (req: Request, res: Response): void => {
  const { id } = req.params

  const existing = db.prepare(`SELECT * FROM pending_items WHERE id = ?`).get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '待处理项不存在' })
    return
  }

  db.prepare(`
    UPDATE pending_items SET status = '已确认', confirmed_at = datetime('now','localtime') WHERE id = ?
  `).run(id)

  const row = db.prepare(`SELECT * FROM pending_items WHERE id = ?`).get(id)
  res.json({ success: true, data: row })
})

router.put('/:id/reject', (req: Request, res: Response): void => {
  const { id } = req.params

  const existing = db.prepare(`SELECT * FROM pending_items WHERE id = ?`).get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: '待处理项不存在' })
    return
  }

  db.prepare(`
    UPDATE pending_items SET status = '已退回' WHERE id = ?
  `).run(id)

  const row = db.prepare(`SELECT * FROM pending_items WHERE id = ?`).get(id)
  res.json({ success: true, data: row })
})

export default router
