import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()
  const conflicts = db.prepare('SELECT * FROM conflicts ORDER BY created_at DESC').all()
  res.json({ success: true, data: conflicts })
})

router.get('/summary', (_req: Request, res: Response): void => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count FROM conflicts GROUP BY status
  `).all() as { status: string; count: number }[]

  const summary = {
    normal: 0,
    auth_expired: 0,
    name_mismatch: 0,
    total: 0,
  }

  for (const row of rows) {
    if (row.status === 'normal') summary.normal = row.count
    else if (row.status === 'auth_expired') summary.auth_expired = row.count
    else if (row.status === 'name_mismatch') summary.name_mismatch = row.count
    summary.total += row.count
  }

  res.json({ success: true, data: summary })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const conflict = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined

  if (!conflict) {
    res.status(404).json({ success: false, error: 'Conflict not found' })
    return
  }

  const tracks = db.prepare('SELECT * FROM tracks WHERE conflict_id = ?').all(req.params.id)
  const noteHistory = db.prepare('SELECT * FROM note_history WHERE conflict_id = ? ORDER BY created_at ASC').all(req.params.id)

  res.json({
    success: true,
    data: {
      ...conflict,
      tracks,
      noteHistory,
    },
  })
})

router.patch('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const { note, authExpired, authNote, status } = req.body

  const existing = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id) as
    | { id: string; note: string; auth_expired: number; auth_note: string; status: string; created_at: string }
    | undefined

  if (!existing) {
    res.status(404).json({ success: false, error: 'Conflict not found' })
    return
  }

  const updates: string[] = []
  const values: unknown[] = []

  if (note !== undefined) {
    updates.push('note = ?')
    values.push(note)
  }
  if (authExpired !== undefined) {
    updates.push('auth_expired = ?')
    values.push(authExpired ? 1 : 0)
  }
  if (authNote !== undefined) {
    updates.push('auth_note = ?')
    values.push(authNote)
  }
  if (status !== undefined) {
    updates.push('status = ?')
    values.push(status)
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    values.push(id)

    const transaction = db.transaction(() => {
      db.prepare(`UPDATE conflicts SET ${updates.join(', ')} WHERE id = ?`).run(...values)

      if (note !== undefined && note !== existing.note) {
        const isSupplementary = new Date().getTime() > new Date(existing.created_at).getTime() + 86400000 ? 1 : 0
        db.prepare(`
          INSERT INTO note_history (id, conflict_id, content, is_supplementary, operator_role, created_at)
          VALUES (?, ?, ?, ?, 'manager', datetime('now'))
        `).run(crypto.randomUUID(), id, note, isSupplementary)
      }
    })

    transaction()
  }

  const updated = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id)
  res.json({ success: true, data: updated })
})

export default router
