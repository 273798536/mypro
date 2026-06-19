import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { log_id, script_id, severity, resolved } = req.query
  let sql = 'SELECT * FROM conflicts WHERE 1=1'
  const params: unknown[] = []
  if (log_id) { sql += ' AND log_id = ?'; params.push(log_id) }
  if (script_id) { sql += ' AND script_id = ?'; params.push(script_id) }
  if (severity) { sql += ' AND severity = ?'; params.push(severity) }
  if (resolved !== undefined) { sql += ' AND resolved = ?'; params.push(resolved === '1' ? 1 : 0) }
  sql += ' ORDER BY created_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '冲突记录未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { log_id, script_id, type, severity, description, chart_data_ref, table_row_ref, conclusion_id } = req.body
  if (!log_id || !script_id || !type || !severity || !description) {
    res.status(400).json({ success: false, error: 'log_id、script_id、type、severity和description必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO conflicts (id, log_id, script_id, type, severity, description, chart_data_ref, table_row_ref, conclusion_id, resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
  ).run(id, log_id, script_id, type, severity, description, chart_data_ref ?? null, table_row_ref ?? null, conclusion_id ?? null, now)
  const row = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '冲突记录未找到' })
    return
  }
  const { type, severity, description, chart_data_ref, table_row_ref, conclusion_id, resolved } = req.body
  db.prepare(
    'UPDATE conflicts SET type = COALESCE(?, type), severity = COALESCE(?, severity), description = COALESCE(?, description), chart_data_ref = COALESCE(?, chart_data_ref), table_row_ref = COALESCE(?, table_row_ref), conclusion_id = COALESCE(?, conclusion_id), resolved = COALESCE(?, resolved) WHERE id = ?'
  ).run(type ?? null, severity ?? null, description ?? null, chart_data_ref ?? null, table_row_ref ?? null, conclusion_id ?? null, resolved ?? null, req.params.id)
  const row = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '冲突记录未找到' })
    return
  }
  db.prepare('DELETE FROM conflicts WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
