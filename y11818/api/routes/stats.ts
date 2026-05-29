import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const pendingCases = (db.prepare(
    `SELECT COUNT(*) as count FROM refund_cases WHERE status IN ('待拆账', '拆账中')`
  ).get() as any).count

  const pendingItems = (db.prepare(
    `SELECT COUNT(*) as count FROM pending_items WHERE status = '待确认'`
  ).get() as any).count

  const completedThisWeek = (db.prepare(
    `SELECT COUNT(*) as count FROM refund_cases WHERE status = '已完成' AND updated_at >= datetime('now','localtime', 'weekday 1', 'start of day')`
  ).get() as any).count

  const interceptCount = (db.prepare(
    `SELECT COUNT(*) as count FROM refund_cases WHERE treatment_consumed > 0`
  ).get() as any).count

  res.json({
    success: true,
    data: {
      pendingCases,
      pendingItems,
      completedThisWeek,
      interceptCount,
    },
  })
})

export default router
