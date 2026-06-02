import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

const router = Router()

const PLATFORM_MAP: Record<string, string> = {
  short_video: '短视频',
  ktv: 'KTV',
  live: '直播',
}

const ANOMALY_TYPE_MAP: Record<string, string> = {
  under_report: '漏报',
  proportion_change: '比例变更',
  duplicate_use: '重复使用',
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const totalRoyaltyRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM usage_records').get() as any
    const totalRoyalty = Math.round(totalRoyaltyRow.total * 100) / 100

    const anomalyCountRow = db.prepare("SELECT COUNT(*) as count FROM works WHERE status = 'anomaly'").get() as any
    const anomalyCount = anomalyCountRow.count

    const currentPeriodRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM usage_records WHERE period = '2026-04'"
    ).get() as any
    const previousPeriodRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM usage_records WHERE period = '2026-03'"
    ).get() as any
    const currentTotal = Math.round(currentPeriodRow.total * 100) / 100
    const previousTotal = Math.round(previousPeriodRow.total * 100) / 100
    const change = previousTotal > 0
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 10000) / 100
      : 0

    const currentPlatformRows = db.prepare(
      "SELECT platform, COALESCE(SUM(amount), 0) as total FROM usage_records WHERE period = '2026-04' GROUP BY platform"
    ).all() as any[]
    const previousPlatformRows = db.prepare(
      "SELECT platform, COALESCE(SUM(amount), 0) as total FROM usage_records WHERE period = '2026-03' GROUP BY platform"
    ).all() as any[]

    const previousPlatformMap: Record<string, number> = {}
    for (const row of previousPlatformRows) {
      previousPlatformMap[row.platform] = Math.round(row.total * 100) / 100
    }

    const platformBreakdown = currentPlatformRows.map(row => {
      const amount = Math.round(row.total * 100) / 100
      const previousAmount = previousPlatformMap[row.platform] || 0
      const platformChange = previousAmount > 0
        ? Math.round(((amount - previousAmount) / previousAmount) * 10000) / 100
        : 0
      return {
        platform: PLATFORM_MAP[row.platform] || row.platform,
        amount,
        change: platformChange,
      }
    })

    const anomalyWorks = db.prepare(
      "SELECT anomalyTypes FROM works WHERE status = 'anomaly'"
    ).all() as any[]

    const typeCounts: Record<string, number> = { under_report: 0, proportion_change: 0, duplicate_use: 0 }
    for (const work of anomalyWorks) {
      const types: string[] = JSON.parse(work.anomalyTypes)
      for (const t of types) {
        if (typeCounts[t] !== undefined) typeCounts[t]++
      }
    }
    const anomalySummary = Object.entries(typeCounts).map(([type, count]) => ({
      type: ANOMALY_TYPE_MAP[type],
      count,
    }))

    const recentAnomalies = (db.prepare(`
      SELECT id, title, anomalyTypes, updatedAt
      FROM works
      WHERE status = 'anomaly'
      ORDER BY updatedAt DESC
      LIMIT 5
    `).all() as any[]).map(row => {
      const types: string[] = JSON.parse(row.anomalyTypes)
      return {
        id: row.id,
        workTitle: row.title,
        type: types.length > 0 ? ANOMALY_TYPE_MAP[types[0]] || types[0] : '',
        date: row.updatedAt,
      }
    })

    res.json({
      success: true,
      data: {
        totalRoyalty,
        anomalyCount,
        periodComparison: { current: currentTotal, previous: previousTotal, change },
        platformBreakdown,
        anomalySummary,
        recentAnomalies,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
