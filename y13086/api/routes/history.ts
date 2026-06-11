import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router({ mergeParams: true })

router.get('/', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const record = db.prepare('SELECT id FROM records WHERE id = ?').get(id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Record not found' })
      return
    }

    const history = db.prepare(
      'SELECT * FROM history_entries WHERE recordId = ? ORDER BY timestamp ASC'
    ).all(id)

    res.json({ success: true, data: history })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' })
  }
})

export default router
