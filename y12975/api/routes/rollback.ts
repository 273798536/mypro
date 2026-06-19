import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { driftId } = req.query
  let sql = 'SELECT * FROM rollback_records WHERE 1=1'
  const params: unknown[] = []

  if (driftId) {
    sql += ' AND drift_id = ?'
    params.push(driftId)
  }

  sql += ' ORDER BY rollback_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

export default router
