import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import type { StatisticsResponse } from '../types.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()

  const total = (db.prepare('SELECT COUNT(*) as cnt FROM cryo_records').get() as { cnt: number }).cnt
  const freezeCount = (db.prepare("SELECT COUNT(*) as cnt FROM cryo_records WHERE type = 'freeze'").get() as { cnt: number }).cnt
  const thawCount = (db.prepare("SELECT COUNT(*) as cnt FROM cryo_records WHERE type = 'thaw'").get() as { cnt: number }).cnt
  const reviewNeeded = (db.prepare("SELECT COUNT(*) as cnt FROM cryo_records WHERE status = 'review_needed'").get() as { cnt: number }).cnt

  const successTotal = (db.prepare("SELECT COUNT(*) as cnt FROM cryo_records WHERE conclusion = 'success'").get() as { cnt: number }).cnt
  const concludedTotal = (db.prepare("SELECT COUNT(*) as cnt FROM cryo_records WHERE conclusion IN ('success', 'failed')").get() as { cnt: number }).cnt
  const successRate = concludedTotal > 0 ? Math.round((successTotal / concludedTotal) * 1000) / 10 : 0

  const byCellLine = db.prepare(
    `SELECT cell_line, COUNT(*) as count,
     ROUND(COALESCE(SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN conclusion IN ('success','failed') THEN 1 ELSE 0 END), 0), 0), 1) as success_rate
     FROM cryo_records GROUP BY cell_line`
  ).all() as { cell_line: string; count: number; success_rate: number }[]

  const byMonth = db.prepare(
    `SELECT strftime('%Y-%m', date) as month,
     SUM(CASE WHEN type = 'freeze' THEN 1 ELSE 0 END) as freeze_count,
     SUM(CASE WHEN type = 'thaw' THEN 1 ELSE 0 END) as thaw_count,
     ROUND(COALESCE(SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN conclusion IN ('success','failed') THEN 1 ELSE 0 END), 0), 0), 1) as success_rate
     FROM cryo_records GROUP BY strftime('%Y-%m', date) ORDER BY month`
  ).all() as { month: string; freeze_count: number; thaw_count: number; success_rate: number }[]

  const data: StatisticsResponse = {
    total_records: total,
    freeze_count: freezeCount,
    thaw_count: thawCount,
    success_rate: successRate,
    review_needed_count: reviewNeeded,
    by_cell_line: byCellLine,
    by_month: byMonth,
  }

  res.json({ success: true, data })
})

router.get('/by-cell-line', (_req: Request, res: Response): void => {
  const db = getDb()
  const data = db.prepare(
    `SELECT cell_line, type, COUNT(*) as count,
     ROUND(COALESCE(SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN conclusion IN ('success','failed') THEN 1 ELSE 0 END), 0), 0), 1) as success_rate,
     AVG(viability_rate) as avg_viability
     FROM cryo_records GROUP BY cell_line, type ORDER BY cell_line, type`
  ).all()
  res.json({ success: true, data })
})

router.get('/by-batch', (_req: Request, res: Response): void => {
  const db = getDb()
  const data = db.prepare(
    `SELECT rb.batch_number, rb.reagent_name, cr.type, COUNT(*) as count,
     ROUND(COALESCE(SUM(CASE WHEN cr.conclusion = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN cr.conclusion IN ('success','failed') THEN 1 ELSE 0 END), 0), 0), 1) as success_rate,
     AVG(cr.viability_rate) as avg_viability
     FROM cryo_records cr JOIN reagent_batches rb ON cr.reagent_batch_id = rb.id
     GROUP BY rb.batch_number, cr.type ORDER BY rb.batch_number`
  ).all()
  res.json({ success: true, data })
})

router.get('/by-date', (_req: Request, res: Response): void => {
  const db = getDb()
  const data = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, cell_line, type, COUNT(*) as count,
     ROUND(COALESCE(SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN conclusion IN ('success','failed') THEN 1 ELSE 0 END), 0), 0), 1) as success_rate,
     AVG(viability_rate) as avg_viability
     FROM cryo_records GROUP BY strftime('%Y-%m', date), cell_line, type ORDER BY month, cell_line`
  ).all()
  res.json({ success: true, data })
})

export default router
