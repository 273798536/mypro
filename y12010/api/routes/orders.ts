import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, enterpriseId, batchId } = req.query

  let sql = `
    SELECT o.*, e.name as enterprise_name, b.name as batch_name
    FROM "order" o
    LEFT JOIN enterprise e ON o.enterprise_id = e.id
    LEFT JOIN batch b ON o.batch_id = b.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (status) {
    sql += ' AND o.status = ?'
    params.push(status)
  }
  if (enterpriseId) {
    sql += ' AND o.enterprise_id = ?'
    params.push(enterpriseId)
  }
  if (batchId) {
    sql += ' AND o.batch_id = ?'
    params.push(batchId)
  }

  sql += ' ORDER BY o.created_at DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/overdue', (_req: Request, res: Response): void => {
  const db = getDb()

  const rows = db.prepare(`
    SELECT o.*, e.name as enterprise_name, b.name as batch_name,
           CAST(julianday('now') - julianday(o.compliance_deadline) AS INTEGER) as overdue_days
    FROM "order" o
    LEFT JOIN enterprise e ON o.enterprise_id = e.id
    LEFT JOIN batch b ON o.batch_id = b.id
    WHERE o.status = 'overdue'
       OR (o.compliance_deadline IS NOT NULL
           AND o.compliance_deadline < datetime('now')
           AND o.status IN ('dealt', 'complying')
           AND o.compliance_time IS NULL)
    ORDER BY overdue_days DESC
  `).all()

  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const row = db.prepare(`
    SELECT o.*, e.name as enterprise_name, b.name as batch_name,
           m.amount as margin_amount, m.status as margin_status, m.lock_time as margin_lock_time
    FROM "order" o
    LEFT JOIN enterprise e ON o.enterprise_id = e.id
    LEFT JOIN batch b ON o.batch_id = b.id
    LEFT JOIN margin_record m ON o.margin_record_id = m.id
    WHERE o.id = ?
  `).get(req.params.id)

  if (!row) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }
  res.json({ success: true, data: row })
})

router.get('/:id/splits', (req: Request, res: Response): void => {
  const db = getDb()
  const orderId = req.params.id

  const order = db.prepare('SELECT * FROM "order" WHERE id = ?').get(orderId)
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  let parentOrder = order as Record<string, unknown>
  if ((parentOrder as Record<string, unknown>).split_from) {
    parentOrder = db.prepare('SELECT * FROM "order" WHERE id = ?').get((parentOrder as Record<string, unknown>).split_from) as Record<string, unknown>
  }

  const splits = db.prepare(`
    SELECT o.*, e.name as enterprise_name
    FROM "order" o
    LEFT JOIN enterprise e ON o.enterprise_id = e.id
    WHERE o.split_from = ?
    ORDER BY o.split_index ASC
  `).all((parentOrder as Record<string, unknown>).id)

  const totalSplitQty = splits.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.quantity as number) || 0), 0)

  res.json({
    success: true,
    data: {
      parentOrder,
      splits,
      totalSplitQty,
      parentQty: (parentOrder as Record<string, unknown>).quantity,
    },
  })
})

router.get('/:id/trace', (req: Request, res: Response): void => {
  const db = getDb()
  const orderId = req.params.id

  const order = db.prepare(`
    SELECT o.*, e.name as enterprise_name, b.name as batch_name
    FROM "order" o
    LEFT JOIN enterprise e ON o.enterprise_id = e.id
    LEFT JOIN batch b ON o.batch_id = b.id
    WHERE o.id = ?
  `).get(orderId) as Record<string, unknown> | undefined

  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const margin = db.prepare(`
    SELECT m.*, e.name as enterprise_name, b.name as batch_name
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    WHERE m.id = ?
  `).get(order.margin_record_id as string) as Record<string, unknown> | undefined

  let releaseRule = null
  if (margin && margin.release_rule_id) {
    releaseRule = db.prepare('SELECT * FROM release_rule WHERE id = ?').get(margin.release_rule_id as string)
  }

  const auditTrail = db.prepare(`
    SELECT * FROM audit_log
    WHERE (entity_type = 'order' AND entity_id = ?)
       OR (entity_type = 'margin' AND entity_id = ?)
    ORDER BY timestamp DESC
  `).all(orderId, margin ? (margin.id as string) : '')

  res.json({
    success: true,
    data: {
      order,
      margin: margin || null,
      releaseRule,
      auditTrail,
    },
  })
})

export default router
