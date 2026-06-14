import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()
  const tracks = db.prepare('SELECT * FROM tracks ORDER BY batch ASC, submitted_at ASC').all() as {
    id: string
    name: string
    display_name: string
    batch: number
    submitted_at: string
    conflict_id: string | null
    is_supplementary: number
    confirmed: number
  }[]

  const grouped: Record<number, typeof tracks> = {}
  for (const track of tracks) {
    if (!grouped[track.batch]) {
      grouped[track.batch] = []
    }
    grouped[track.batch].push(track)
  }

  res.json({ success: true, data: grouped })
})

router.patch('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const { confirmed } = req.body

  if (confirmed === undefined) {
    res.status(400).json({ success: false, error: 'confirmed field is required' })
    return
  }

  const existing = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Track not found' })
    return
  }

  db.prepare('UPDATE tracks SET confirmed = ? WHERE id = ?').run(confirmed ? 1 : 0, id)

  const updated = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id)
  res.json({ success: true, data: updated })
})

export default router
