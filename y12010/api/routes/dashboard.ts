import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/stats', (_req: Request, res: Response): void => {
  const db = getDb()

  const lockedTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM margin_record WHERE status = 'locked'
  `).get() as { total: number }

  const pendingRelease = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM margin_record WHERE status = 'pending_release'
  `).get() as { total: number }

  const delayedReleaseCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM margin_record WHERE status = 'delayed_release'
  `).get() as { cnt: number }

  const overdueCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM "order"
    WHERE status = 'overdue'
       OR (compliance_deadline IS NOT NULL
           AND compliance_deadline < datetime('now')
           AND status IN ('dealt', 'complying')
           AND compliance_time IS NULL)
  `).get() as { cnt: number }

  res.json({
    success: true,
    data: {
      lockedTotal: lockedTotal.total,
      pendingRelease: pendingRelease.total,
      delayedReleaseCount: delayedReleaseCount.cnt,
      overdueCount: overdueCount.cnt,
    },
  })
})

router.get('/alerts', (_req: Request, res: Response): void => {
  const db = getDb()
  const alerts: { type: string; level: string; message: string; entityId: string; entityType: string; timestamp: string }[] = []

  const delayedReleases = db.prepare(`
    SELECT m.*, e.name as enterprise_name, b.name as batch_name,
           o.cancel_time
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    LEFT JOIN "order" o ON o.margin_record_id = m.id AND o.status = 'cancelled'
    WHERE m.status = 'delayed_release'
  `).all() as Record<string, unknown>[]

  for (const dr of delayedReleases) {
    const cancelTime = dr.cancel_time as string | null
    const daysSinceCancel = cancelTime
      ? Math.floor((Date.now() - new Date(cancelTime).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    alerts.push({
      type: 'delayed_release',
      level: 'warning',
      message: `${dr.enterprise_name} 撤单保证金延迟释放中，已等待 ${daysSinceCancel} 天`,
      entityId: dr.id as string,
      entityType: 'margin',
      timestamp: new Date().toISOString(),
    })
  }

  const overdueOrders = db.prepare(`
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
  `).all() as Record<string, unknown>[]

  for (const oo of overdueOrders) {
    alerts.push({
      type: 'overdue',
      level: 'error',
      message: `${oo.enterprise_name} 履约逾期 ${(oo.overdue_days as number) || 0} 天`,
      entityId: oo.id as string,
      entityType: 'order',
      timestamp: new Date().toISOString(),
    })
  }

  const crossBatchUnsettled = db.prepare(`
    SELECT e.id as enterprise_id, e.name as enterprise_name, COUNT(DISTINCT m.batch_id) as batch_count
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    WHERE m.status IN ('locked', 'pending_release', 'delayed_release')
    GROUP BY m.enterprise_id
    HAVING batch_count > 1
  `).all() as Record<string, unknown>[]

  for (const cb of crossBatchUnsettled) {
    alerts.push({
      type: 'cross_batch_unsettled',
      level: 'info',
      message: `${cb.enterprise_name} 存在 ${cb.batch_count} 个批次未释放保证金`,
      entityId: cb.enterprise_id as string,
      entityType: 'enterprise',
      timestamp: new Date().toISOString(),
    })
  }

  res.json({ success: true, data: alerts })
})

router.get('/batch-progress', (_req: Request, res: Response): void => {
  const db = getDb()

  const progress = db.prepare(`
    SELECT
      b.id,
      b.name,
      b.status as batch_status,
      COUNT(m.id) as total_records,
      SUM(m.amount) as total_amount,
      SUM(CASE WHEN m.status = 'locked' THEN m.amount ELSE 0 END) as locked_amount,
      SUM(CASE WHEN m.status = 'released' THEN m.amount ELSE 0 END) as released_amount,
      SUM(CASE WHEN m.status = 'pending_release' THEN m.amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN m.status = 'delayed_release' THEN m.amount ELSE 0 END) as delayed_amount
    FROM batch b
    LEFT JOIN margin_record m ON m.batch_id = b.id
    GROUP BY b.id, b.name, b.status
    ORDER BY b.start_date DESC
  `).all()

  res.json({ success: true, data: progress })
})

router.get('/enterprises', (_req: Request, res: Response): void => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name FROM enterprise ORDER BY name').all()
  res.json({ success: true, data: rows })
})

router.get('/batches', (_req: Request, res: Response): void => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name FROM batch ORDER BY start_date DESC').all()
  res.json({ success: true, data: rows })
})

export default router
