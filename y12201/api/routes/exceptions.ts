import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { logAudit } from '../services/audit-service.js'

export default function (router: Router) {
  router.get('/', (req: Request, res: Response): void => {
    const { type, status } = req.query
    let sql = 'SELECT * FROM exceptions WHERE 1=1'
    const params: any[] = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  })

  router.get('/stats', (req: Request, res: Response): void => {
    const byType = db.prepare(`
      SELECT type, COUNT(*) as count, SUM(impact) as total_impact
      FROM exceptions
      GROUP BY type
    `).all()

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM exceptions
      GROUP BY status
    `).all()

    const totalPending = db.prepare(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'pending'`).get() as any
    const totalImpact = db.prepare(`SELECT SUM(impact) as total FROM exceptions WHERE status = 'pending'`).get() as any

    res.json({
      success: true,
      data: {
        byType,
        byStatus,
        totalPending: totalPending.count,
        totalPendingImpact: totalImpact.total || 0
      }
    })
  })

  router.put('/:id', (req: Request, res: Response): void => {
    const { id } = req.params
    const { action, resolution } = req.body

    if (!action || !resolution) {
      res.status(400).json({ success: false, error: 'action and resolution are required' })
      return
    }

    if (action !== 'confirm' && action !== 'reject') {
      res.status(400).json({ success: false, error: 'action must be confirm or reject' })
      return
    }

    const exception = db.prepare(`SELECT * FROM exceptions WHERE id = ?`).get(id) as any
    if (!exception) {
      res.status(404).json({ success: false, error: 'Exception not found' })
      return
    }

    const now = new Date().toISOString()
    const newStatus = action === 'confirm' ? 'confirmed' : 'rejected'

    const updateException = db.transaction(() => {
      logAudit({
        entityType: 'exception',
        entityId: id,
        field: 'status',
        oldValue: exception.status,
        newValue: newStatus,
        reason: resolution,
        impactAmount: exception.impact
      })

      db.prepare(`
        UPDATE exceptions SET status = ?, resolution = ?, resolved_by = 'operator', resolved_at = ?
        WHERE id = ?
      `).run(newStatus, resolution, now, id)
    })

    updateException()

    const updated = db.prepare(`SELECT * FROM exceptions WHERE id = ?`).get(id)
    res.json({ success: true, data: updated })
  })
}
