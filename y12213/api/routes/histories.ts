import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { targetType, targetId, actionType } = req.query

  let sql = 'SELECT * FROM histories WHERE 1=1'
  const params: any[] = []

  if (targetType) {
    sql += ' AND target_type = ?'
    params.push(targetType)
  }
  if (targetId) {
    sql += ' AND target_id = ?'
    params.push(targetId)
  }
  if (actionType) {
    sql += ' AND action_type = ?'
    params.push(actionType)
  }

  sql += ' ORDER BY created_at DESC LIMIT 200'

  const histories = db.prepare(sql).all(...params)
  res.json({ success: true, data: histories })
})

export default router
