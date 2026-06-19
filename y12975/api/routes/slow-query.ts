import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { driftId } = req.query
  let sql = 'SELECT * FROM slow_query_attribution WHERE 1=1'
  const params: unknown[] = []

  if (driftId) {
    sql += ' AND drift_id = ?'
    params.push(driftId)
  }

  sql += ' ORDER BY query_time_ms DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

export default router
