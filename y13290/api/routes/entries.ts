import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const entries = db.prepare('SELECT * FROM entries ORDER BY id').all()
    res.json({ success: true, data: entries })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.post('/batch', (req: Request, res: Response): void => {
  try {
    const { entries } = req.body as {
      entries: Array<{ name: string; latitude: number; longitude: number; opinion: string; source: string }>
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ success: false, error: 'entries array is required' })
      return
    }

    const insert = db.prepare(
      'INSERT INTO entries (name, latitude, longitude, opinion, source) VALUES (?, ?, ?, ?, ?)'
    )

    const transaction = db.transaction(() => {
      const results = []
      for (const e of entries) {
        const result = insert.run(e.name, e.latitude, e.longitude, e.opinion, e.source)
        results.push({ id: result.lastInsertRowid, ...e })
      }
      return results
    })

    const data = transaction()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.patch('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const body = req.body as {
      name?: string
      latitude?: number
      longitude?: number
      opinion?: string
      source?: string
    }

    const existing = db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
    if (!existing) {
      res.status(404).json({ success: false, error: 'Entry not found' })
      return
    }

    const fields: string[] = []
    const values: unknown[] = []

    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name) }
    if (body.latitude !== undefined) { fields.push('latitude = ?'); values.push(body.latitude) }
    if (body.longitude !== undefined) { fields.push('longitude = ?'); values.push(body.longitude) }
    if (body.opinion !== undefined) { fields.push('opinion = ?'); values.push(body.opinion) }
    if (body.source !== undefined) { fields.push('source = ?'); values.push(body.source) }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' })
      return
    }

    fields.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE entries SET ${fields.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const result = db.prepare('DELETE FROM entries WHERE id = ?').run(id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Entry not found' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

export default router
