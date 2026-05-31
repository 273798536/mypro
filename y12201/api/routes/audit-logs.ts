import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { getImpactAnalysis } from '../services/audit-service.js'

export default function (router: Router) {
  router.get('/', (req: Request, res: Response): void => {
    const { entityType, from, to } = req.query
    let sql = 'SELECT * FROM audit_logs WHERE 1=1'
    const params: any[] = []

    if (entityType) {
      sql += ' AND entity_type = ?'
      params.push(entityType)
    }
    if (from) {
      sql += ' AND created_at >= ?'
      params.push(from)
    }
    if (to) {
      sql += ' AND created_at <= ?'
      params.push(to)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  })

  router.get('/:id/impact', (req: Request, res: Response): void => {
    const { id } = req.params
    const analysis = getImpactAnalysis(id)

    if (!analysis) {
      res.status(404).json({ success: false, error: 'Audit log not found' })
      return
    }

    res.json({ success: true, data: analysis })
  })
}
