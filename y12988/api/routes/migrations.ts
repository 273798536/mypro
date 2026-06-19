import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM migrations ORDER BY created_at DESC').all()
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM migrations WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '迁移任务未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { name, status = 'pending', related_log_count = 0, conflict_count = 0 } = req.body
  if (!name) {
    res.status(400).json({ success: false, error: 'name字段必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO migrations (id, name, status, related_log_count, conflict_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, status, related_log_count, conflict_count, now, now)
  const row = db.prepare('SELECT * FROM migrations WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM migrations WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '迁移任务未找到' })
    return
  }
  const { name, status, related_log_count, conflict_count } = req.body
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'UPDATE migrations SET name = COALESCE(?, name), status = COALESCE(?, status), related_log_count = COALESCE(?, related_log_count), conflict_count = COALESCE(?, conflict_count), updated_at = ? WHERE id = ?'
  ).run(name ?? null, status ?? null, related_log_count ?? null, conflict_count ?? null, now, req.params.id)
  const row = db.prepare('SELECT * FROM migrations WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM migrations WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '迁移任务未找到' })
    return
  }
  db.prepare('DELETE FROM migrations WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
