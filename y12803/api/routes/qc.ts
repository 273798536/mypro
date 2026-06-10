import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

interface MonthlyTrend {
  month: string
  total: number
  abnormal: number
  missing: number
  abnormal_rate: number
  missing_rate: number
}

router.get('/summary', (_req: Request, res: Response): void => {
  const db = getDb()

  const totalRecords = db.prepare('SELECT COUNT(*) as cnt FROM growth_measurements').get() as { cnt: number }

  const abnormalCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM growth_measurements WHERE annotation = 'abnormal'"
  ).get() as { cnt: number }

  const pendingCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM growth_measurements WHERE annotation = 'pending'"
  ).get() as { cnt: number }

  const nullHeightCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM growth_measurements WHERE height IS NULL'
  ).get() as { cnt: number }

  const nullLeafAreaCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM growth_measurements WHERE leaf_area IS NULL'
  ).get() as { cnt: number }

  const nullStemDiameterCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM growth_measurements WHERE stem_diameter IS NULL'
  ).get() as { cnt: number }

  const totalFields = totalRecords.cnt * 3
  const missingFields = nullHeightCount.cnt + nullLeafAreaCount.cnt + nullStemDiameterCount.cnt
  const missingRate = totalFields > 0 ? Math.round((missingFields / totalFields) * 10000) / 100 : 0

  const abnormalRate = totalRecords.cnt > 0
    ? Math.round((abnormalCount.cnt / totalRecords.cnt) * 10000) / 100
    : 0

  const annotationCompleteness = totalRecords.cnt > 0
    ? Math.round(((totalRecords.cnt - pendingCount.cnt) / totalRecords.cnt) * 10000) / 100
    : 0

  const monthlyRows = db.prepare(`
    SELECT
      strftime('%Y-%m', measured_at) as month,
      COUNT(*) as total,
      SUM(CASE WHEN annotation = 'abnormal' THEN 1 ELSE 0 END) as abnormal,
      SUM(CASE WHEN height IS NULL THEN 1 ELSE 0 END) +
      SUM(CASE WHEN leaf_area IS NULL THEN 1 ELSE 0 END) +
      SUM(CASE WHEN stem_diameter IS NULL THEN 1 ELSE 0 END) as missing
    FROM growth_measurements
    GROUP BY strftime('%Y-%m', measured_at)
    ORDER BY month
  `).all() as Array<{ month: string; total: number; abnormal: number; missing: number }>

  const monthlyTrend: MonthlyTrend[] = monthlyRows.map(r => ({
    month: r.month,
    total: r.total,
    abnormal: r.abnormal,
    missing: r.missing,
    abnormal_rate: r.total > 0 ? Math.round((r.abnormal / r.total) * 10000) / 100 : 0,
    missing_rate: r.total * 3 > 0 ? Math.round((r.missing / (r.total * 3)) * 10000) / 100 : 0,
  }))

  res.json({
    success: true,
    data: {
      totalRecords: totalRecords.cnt,
      abnormalRate,
      missingRate,
      annotationCompleteness,
      monthlyTrend,
    },
  })
})

export default router
