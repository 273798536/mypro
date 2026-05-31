import { Router, type Request, type Response } from 'express'
import { getDb } from '../database/init.js'
import type { DashboardStats, TrendItem, WarningItem } from '../../shared/types.js'

const router = Router()

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const today = new Date().toISOString().split('T')[0]

    const pending = db.prepare("SELECT COUNT(*) as cnt FROM bill WHERE status = 'pending'").get() as { cnt: number }
    const exception = db.prepare("SELECT COUNT(*) as cnt FROM bill WHERE status = 'exception'").get() as { cnt: number }
    const approved = db.prepare("SELECT COUNT(*) as cnt FROM bill WHERE status = 'approved'").get() as { cnt: number }
    const rejected = db.prepare("SELECT COUNT(*) as cnt FROM bill WHERE status = 'rejected'").get() as { cnt: number }
    const todayProcessed = db.prepare(
      "SELECT COUNT(*) as cnt FROM bill WHERE reviewed_at >= ? AND status IN ('approved', 'rejected')"
    ).get(today) as { cnt: number }

    const stats: DashboardStats = {
      pending_count: pending.cnt,
      exception_count: exception.cnt,
      approved_count: approved.cnt,
      rejected_count: rejected.cnt,
      today_processed: todayProcessed.cnt,
    }

    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/trend', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const trend: TrendItem[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const approved = db.prepare(
        "SELECT COUNT(*) as cnt FROM bill WHERE date(reviewed_at) = ? AND status = 'approved'"
      ).get(dateStr) as { cnt: number }

      const rejected = db.prepare(
        "SELECT COUNT(*) as cnt FROM bill WHERE date(reviewed_at) = ? AND status = 'rejected'"
      ).get(dateStr) as { cnt: number }

      const exception = db.prepare(
        "SELECT COUNT(*) as cnt FROM bill WHERE date(reviewed_at) = ? AND status = 'exception'"
      ).get(dateStr) as { cnt: number }

      trend.push({
        date: dateStr,
        approved: approved.cnt,
        rejected: rejected.cnt,
        exception: exception.cnt,
      })
    }

    res.json({ success: true, data: trend })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/warnings', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const warnings: WarningItem[] = []
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const oldExceptions = db.prepare(
      `SELECT be.*, b.user_no FROM bill_exception be
       JOIN bill b ON be.bill_id = b.id
       WHERE be.resolved = 0 AND be.created_at < ?`
    ).all(threeDaysAgo) as Array<{ id: string; type: string; severity: string; description: string; created_at: string; user_no: string }>

    for (const ex of oldExceptions) {
      const daysDiff = Math.floor((now.getTime() - new Date(ex.created_at).getTime()) / (24 * 60 * 60 * 1000))
      warnings.push({
        id: ex.id,
        type: 'exception_unresolved',
        message: `用户${ex.user_no}的异常(${ex.type})已超过${daysDiff}天未处理`,
        severity: ex.severity as 'low' | 'medium' | 'high',
        days_remaining: -daysDiff,
        created_at: ex.created_at,
      })
    }

    const expiringDiscounts = db.prepare(
      `SELECT up.user_no, up.name, up.discount_expire_date, up.discount_rate
       FROM user_profile up
       WHERE up.discount_rate IS NOT NULL
       AND up.discount_expire_date IS NOT NULL
       AND up.discount_expire_date <= ?
       AND up.discount_expire_date >= ?`
    ).all(sevenDaysLater, now.toISOString().split('T')[0]) as Array<{ user_no: string; name: string; discount_expire_date: string; discount_rate: number }>

    for (const d of expiringDiscounts) {
      const expireDate = new Date(d.discount_expire_date)
      const daysRemaining = Math.ceil((expireDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      warnings.push({
        id: `discount_${d.user_no}`,
        type: 'discount_expiring',
        message: `用户${d.name}(${d.user_no})的减免优惠将于${d.discount_expire_date}到期`,
        severity: 'medium',
        days_remaining: daysRemaining,
        created_at: now.toISOString(),
      })
    }

    res.json({ success: true, data: warnings })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
