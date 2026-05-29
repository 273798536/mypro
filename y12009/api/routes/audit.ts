import { Router, type Request, type Response } from 'express'
import { listAuditLogs } from '../services/audit.js'

const router = Router()

router.get('/audit-logs', (req: Request, res: Response): void => {
  try {
    const filters = {
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      action: req.query.action as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    }
    const data = listAuditLogs(filters)
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
