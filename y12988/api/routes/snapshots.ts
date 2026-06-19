import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { table_name, conclusion_id } = req.query
  let sql = 'SELECT * FROM snapshots WHERE 1=1'
  const params: unknown[] = []
  if (table_name) { sql += ' AND table_name = ?'; params.push(table_name) }
  if (conclusion_id) { sql += ' AND conclusion_id = ?'; params.push(conclusion_id) }
  sql += ' ORDER BY captured_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '快照未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { table_name, schema_ddl, conclusion_id } = req.body
  if (!table_name || !schema_ddl) {
    res.status(400).json({ success: false, error: 'table_name和schema_ddl必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO snapshots (id, table_name, schema_ddl, conclusion_id, captured_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, table_name, schema_ddl, conclusion_id ?? null, now)
  const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '快照未找到' })
    return
  }
  const { table_name, schema_ddl, conclusion_id } = req.body
  db.prepare(
    'UPDATE snapshots SET table_name = COALESCE(?, table_name), schema_ddl = COALESCE(?, schema_ddl), conclusion_id = COALESCE(?, conclusion_id) WHERE id = ?'
  ).run(table_name ?? null, schema_ddl ?? null, conclusion_id ?? null, req.params.id)
  const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '快照未找到' })
    return
  }
  db.prepare('DELETE FROM snapshots WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
