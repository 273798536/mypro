import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/:animalId', (req: Request, res: Response): void => {
  const { animalId } = req.params

  const sessions = db.prepare(
    'SELECT * FROM trajectory_sessions WHERE animal_id = ?'
  ).all(animalId) as { id: number; session_id: string }[]

  if (sessions.length === 0) {
    res.status(404).json({ success: false, error: '未找到该动物的轨迹数据' })
    return
  }

  const result = sessions.map(session => {
    const points = db.prepare(
      'SELECT * FROM trajectory_points WHERE session_id = ? ORDER BY timestamp'
    ).all(session.id)

    const annotations = db.prepare(
      'SELECT * FROM trajectory_annotations WHERE session_id = ? ORDER BY point_index'
    ).all(session.id)

    return {
      ...session,
      points,
      annotations,
    }
  })

  res.json({ success: true, data: result })
})

router.get('/', (_req: Request, res: Response): void => {
  const sessions = db.prepare(
    `SELECT s.*,
            (SELECT COUNT(*) FROM trajectory_points WHERE session_id = s.id) as point_count,
            (SELECT COUNT(*) FROM trajectory_annotations WHERE session_id = s.id) as annotation_count
     FROM trajectory_sessions s
     ORDER BY s.start_time DESC`
  ).all()

  res.json({ success: true, data: sessions })
})

export default router
