import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM migration_scripts ORDER BY version DESC, created_at DESC').all()
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM migration_scripts WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '迁移脚本未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { name, version = 1, content } = req.body
  if (!name || !content) {
    res.status(400).json({ success: false, error: 'name和content字段必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO migration_scripts (id, name, version, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, version, content, now)
  const row = db.prepare('SELECT * FROM migration_scripts WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM migration_scripts WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '迁移脚本未找到' })
    return
  }
  const { name, version, content } = req.body
  db.prepare(
    'UPDATE migration_scripts SET name = COALESCE(?, name), version = COALESCE(?, version), content = COALESCE(?, content) WHERE id = ?'
  ).run(name ?? null, version ?? null, content ?? null, req.params.id)
  const row = db.prepare('SELECT * FROM migration_scripts WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM migration_scripts WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '迁移脚本未找到' })
    return
  }
  db.prepare('DELETE FROM migration_scripts WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
