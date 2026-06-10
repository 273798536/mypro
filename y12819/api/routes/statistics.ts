import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/groups', (_req: Request, res: Response): void => {
  const groups = db.prepare(
    `SELECT
       experiment_group as group_name,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
       SUM(CASE WHEN status = 'anomaly' THEN 1 ELSE 0 END) as anomaly,
       SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review
     FROM culture_records
     GROUP BY experiment_group`
  ).all() as { group_name: string; total: number; normal: number; anomaly: number; pending_review: number }[]

  const result = groups.map(g => ({
    ...g,
    anomaly_rate: g.total > 0 ? Number((g.anomaly / g.total * 100).toFixed(1)) : 0,
  }))

  res.json({ success: true, data: result })
})

router.get('/trends', (req: Request, res: Response): void => {
  const { start_date, end_date } = req.query

  let sql = `SELECT
               culture_date,
               COUNT(*) as total,
               SUM(CASE WHEN status = 'anomaly' THEN 1 ELSE 0 END) as anomaly_count
             FROM culture_records
             WHERE 1=1`
  const params: unknown[] = []

  if (start_date) {
    sql += ' AND culture_date >= ?'
    params.push(start_date)
  }
  if (end_date) {
    sql += ' AND culture_date <= ?'
    params.push(end_date)
  }

  sql += ' GROUP BY culture_date ORDER BY culture_date'

  const trends = db.prepare(sql).all(...params) as { culture_date: string; total: number; anomaly_count: number }[]

  const result = trends.map(t => ({
    date: t.culture_date,
    total: t.total,
    anomaly_count: t.anomaly_count,
    anomaly_rate: t.total > 0 ? Number((t.anomaly_count / t.total * 100).toFixed(1)) : 0,
  }))

  res.json({ success: true, data: result })
})

router.get('/by-location', (_req: Request, res: Response): void => {
  const locations = db.prepare(
    `SELECT
       COALESCE(sampling_location, '未指定') as location,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
       SUM(CASE WHEN status = 'anomaly' THEN 1 ELSE 0 END) as anomaly,
       SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review
     FROM culture_records
     GROUP BY sampling_location`
  ).all() as { location: string; total: number; normal: number; anomaly: number; pending_review: number }[]

  const result = locations.map(l => ({
    ...l,
    anomaly_rate: l.total > 0 ? Number((l.anomaly / l.total * 100).toFixed(1)) : 0,
  }))

  res.json({ success: true, data: result })
})

export default router
