import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20

    const rows = db.prepare(`
      SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?
    `).all(limit) as Array<Record<string, unknown>>

    const data = rows.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      details: log.details,
      performedBy: log.performed_by,
      createdAt: log.created_at,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取审计日志失败' })
  }
})

export default router
