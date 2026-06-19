import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { related_snapshot_id, immutable } = req.query
  let sql = 'SELECT * FROM conclusions WHERE 1=1'
  const params: unknown[] = []
  if (related_snapshot_id) { sql += ' AND related_snapshot_id = ?'; params.push(related_snapshot_id) }
  if (immutable !== undefined) { sql += ' AND immutable = ?'; params.push(immutable === '1' ? 1 : 0) }
  sql += ' ORDER BY created_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM conclusions WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '结论未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { content, related_snapshot_id, immutable = 0 } = req.body
  if (!content) {
    res.status(400).json({ success: false, error: 'content字段必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO conclusions (id, content, related_snapshot_id, immutable, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, content, related_snapshot_id ?? null, immutable, now)
  const row = db.prepare('SELECT * FROM conclusions WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM conclusions WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '结论未找到' })
    return
  }
  if ((existing as { immutable: number }).immutable === 1) {
    res.status(403).json({ success: false, error: '不可变结论不允许修改' })
    return
  }
  const { content, related_snapshot_id, immutable } = req.body
  db.prepare(
    'UPDATE conclusions SET content = COALESCE(?, content), related_snapshot_id = COALESCE(?, related_snapshot_id), immutable = COALESCE(?, immutable) WHERE id = ?'
  ).run(content ?? null, related_snapshot_id ?? null, immutable ?? null, req.params.id)
  const row = db.prepare('SELECT * FROM conclusions WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM conclusions WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '结论未找到' })
    return
  }
  if ((existing as { immutable: number }).immutable === 1) {
    res.status(403).json({ success: false, error: '不可变结论不允许删除' })
    return
  }
  db.prepare('DELETE FROM conclusions WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
