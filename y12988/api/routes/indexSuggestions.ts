import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { table_name, impact } = req.query
  let sql = 'SELECT * FROM index_suggestions WHERE 1=1'
  const params: unknown[] = []
  if (table_name) { sql += ' AND table_name = ?'; params.push(table_name) }
  if (impact) { sql += ' AND impact = ?'; params.push(impact) }
  sql += ' ORDER BY created_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '索引建议未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { table_name, suggested_index, reason, explanation, impact } = req.body
  if (!table_name || !suggested_index || !reason || !explanation || !impact) {
    res.status(400).json({ success: false, error: '所有字段均为必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO index_suggestions (id, table_name, suggested_index, reason, explanation, impact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, table_name, suggested_index, reason, explanation, impact, now)
  const row = db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '索引建议未找到' })
    return
  }
  const { table_name, suggested_index, reason, explanation, impact } = req.body
  db.prepare(
    'UPDATE index_suggestions SET table_name = COALESCE(?, table_name), suggested_index = COALESCE(?, suggested_index), reason = COALESCE(?, reason), explanation = COALESCE(?, explanation), impact = COALESCE(?, impact) WHERE id = ?'
  ).run(table_name ?? null, suggested_index ?? null, reason ?? null, explanation ?? null, impact ?? null, req.params.id)
  const row = db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '索引建议未找到' })
    return
  }
  db.prepare('DELETE FROM index_suggestions WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
