import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { driftId, action } = req.query
  let sql = `
    SELECT h.*, d.table_name, d.field_name, d.status as drift_status
    FROM correction_history h
    LEFT JOIN drift_records d ON h.drift_id = d.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (driftId) {
    sql += ' AND h.drift_id = ?'
    params.push(driftId)
  }
  if (action) {
    sql += ' AND h.action = ?'
    params.push(action)
  }

  sql += ' ORDER BY h.action_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

export default router
