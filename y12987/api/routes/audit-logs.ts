import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function buildFilterQuery(req: Request): { sql: string; countSql: string; params: unknown[] } {
  const conditions: string[] = []
  const params: unknown[] = []

  const actionType = req.query.actionType as string | undefined
  if (actionType) {
    conditions.push('action_type = ?')
    params.push(actionType)
  }

  const entityType = req.query.entityType as string | undefined
  if (entityType) {
    conditions.push('entity_type = ?')
    params.push(entityType)
  }

  const operator = req.query.operator as string | undefined
  if (operator) {
    conditions.push('operator = ?')
    params.push(operator)
  }

  const startDate = req.query.startDate as string | undefined
  if (startDate) {
    conditions.push('operated_at >= ?')
    params.push(startDate)
  }

  const endDate = req.query.endDate as string | undefined
  if (endDate) {
    conditions.push('operated_at <= ?')
    params.push(endDate)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  return {
    sql: `SELECT * FROM audit_logs ${where} ORDER BY operated_at DESC`,
    countSql: `SELECT COUNT(*) as total FROM audit_logs ${where}`,
    params,
  }
}

router.get('/', (req: Request, res: Response): void => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const pageSize = Math.max(1, parseInt(req.query.pageSize as string) || 20)

  const { countSql, sql, params } = buildFilterQuery(req)

  const { total } = db.prepare(countSql).get(params) as { total: number }
  const list = db.prepare(`${sql} LIMIT ? OFFSET ?`).all([...params, pageSize, (page - 1) * pageSize]) as Array<{
    id: string
    action_type: string
    entity_type: string
    entity_id: string
    operator: string
    operated_at: string
    reason: string
    snapshot: string
  }>

  res.json({
    success: true,
    data: {
      list: list.map((log) => ({
        id: log.id,
        actionType: log.action_type,
        entityType: log.entity_type,
        entityId: log.entity_id,
        operator: log.operator,
        operatedAt: log.operated_at,
        reason: log.reason,
        snapshot: JSON.parse(log.snapshot || '{}'),
      })),
      total,
      page,
      pageSize,
    },
  })
})

router.get('/export', (req: Request, res: Response): void => {
  const { sql, params } = buildFilterQuery(req)

  const list = db.prepare(sql).all(params) as Array<{
    id: string
    action_type: string
    entity_type: string
    entity_id: string
    operator: string
    operated_at: string
    reason: string
    snapshot: string
  }>

  const headers = ['id', 'actionType', 'entityType', 'entityId', 'operator', 'operatedAt', 'reason', 'snapshot']
  const rows = list.map((log) =>
    [log.id, log.action_type, log.entity_type, log.entity_id, log.operator, log.operated_at, log.reason, log.snapshot]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().slice(0, 10)}.csv`)
  res.send('\uFEFF' + csv)
})

export default router
