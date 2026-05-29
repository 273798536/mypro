import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/logs', (req: Request, res: Response): void => {
  const db = getDb()
  const { entityType, entityId, startTime, endTime } = req.query

  let sql = 'SELECT * FROM audit_log WHERE 1=1'
  const params: unknown[] = []

  if (entityType) {
    sql += ' AND entity_type = ?'
    params.push(entityType)
  }
  if (entityId) {
    sql += ' AND entity_id = ?'
    params.push(entityId)
  }
  if (startTime) {
    sql += ' AND timestamp >= ?'
    params.push(startTime)
  }
  if (endTime) {
    sql += ' AND timestamp <= ?'
    params.push(endTime)
  }

  sql += ' ORDER BY timestamp DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/trace/:entityType/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { entityType, id } = req.params

  if (!['margin', 'order', 'rule', 'import'].includes(entityType)) {
    res.status(400).json({ success: false, error: '无效的实体类型，支持: margin, order, rule, import' })
    return
  }

  let marginLock: Record<string, unknown> | null = null
  let order: Record<string, unknown> | null = null
  let releaseRule: Record<string, unknown> | null = null

  if (entityType === 'margin') {
    marginLock = db.prepare(`
      SELECT m.*, e.name as enterprise_name, b.name as batch_name
      FROM margin_record m
      LEFT JOIN enterprise e ON m.enterprise_id = e.id
      LEFT JOIN batch b ON m.batch_id = b.id
      WHERE m.id = ?
    `).get(id) as Record<string, unknown> | undefined || null

    if (marginLock) {
      const relatedOrder = db.prepare('SELECT * FROM "order" WHERE margin_record_id = ? LIMIT 1').get(id) as Record<string, unknown> | undefined
      order = relatedOrder || null

      if (marginLock.release_rule_id) {
        releaseRule = db.prepare('SELECT * FROM release_rule WHERE id = ?').get(marginLock.release_rule_id as string) as Record<string, unknown> | undefined || null
      }
    }
  } else if (entityType === 'order') {
    order = db.prepare(`
      SELECT o.*, e.name as enterprise_name, b.name as batch_name
      FROM "order" o
      LEFT JOIN enterprise e ON o.enterprise_id = e.id
      LEFT JOIN batch b ON o.batch_id = b.id
      WHERE o.id = ?
    `).get(id) as Record<string, unknown> | undefined || null

    if (order) {
      marginLock = db.prepare(`
        SELECT m.*, e.name as enterprise_name, b.name as batch_name
        FROM margin_record m
        LEFT JOIN enterprise e ON m.enterprise_id = e.id
        LEFT JOIN batch b ON m.batch_id = b.id
        WHERE m.id = ?
      `).get(order.margin_record_id as string) as Record<string, unknown> | undefined || null

      if (marginLock && marginLock.release_rule_id) {
        releaseRule = db.prepare('SELECT * FROM release_rule WHERE id = ?').get(marginLock.release_rule_id as string) as Record<string, unknown> | undefined || null
      }
    }
  }

  const entityIds: string[] = [id]
  if (marginLock) entityIds.push(marginLock.id as string)
  if (order) entityIds.push(order.id as string)

  const placeholders = entityIds.map(() => '?').join(',')
  const auditTrail = db.prepare(`
    SELECT * FROM audit_log
    WHERE entity_id IN (${placeholders})
    ORDER BY timestamp DESC
  `).all(...entityIds)

  res.json({
    success: true,
    data: {
      entityId: id,
      entityType,
      marginLock,
      order,
      releaseRule,
      auditTrail,
    },
  })
})

export default router
