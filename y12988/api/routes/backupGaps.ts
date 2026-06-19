import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { source_table, conclusion_id } = req.query
  let sql = 'SELECT * FROM backup_gaps WHERE 1=1'
  const params: unknown[] = []
  if (source_table) { sql += ' AND source_table = ?'; params.push(source_table) }
  if (conclusion_id) { sql += ' AND conclusion_id = ?'; params.push(conclusion_id) }
  sql += ' ORDER BY original_line_no ASC'
  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM backup_gaps WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '备份缺口未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { original_line_no, image_name, source_remark, source_table, source_record_id, description, conclusion_id } = req.body
  if (!original_line_no || !source_table || !source_record_id || !description) {
    res.status(400).json({ success: false, error: 'original_line_no、source_table、source_record_id和description必填' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO backup_gaps (id, original_line_no, image_name, source_remark, source_table, source_record_id, description, conclusion_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, original_line_no, image_name ?? null, source_remark ?? null, source_table, source_record_id, description, conclusion_id ?? null, now)
  const row = db.prepare('SELECT * FROM backup_gaps WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM backup_gaps WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '备份缺口未找到' })
    return
  }
  const { original_line_no, image_name, source_remark, source_table, source_record_id, description, conclusion_id } = req.body
  db.prepare(
    'UPDATE backup_gaps SET original_line_no = COALESCE(?, original_line_no), image_name = COALESCE(?, image_name), source_remark = COALESCE(?, source_remark), source_table = COALESCE(?, source_table), source_record_id = COALESCE(?, source_record_id), description = COALESCE(?, description), conclusion_id = COALESCE(?, conclusion_id) WHERE id = ?'
  ).run(original_line_no ?? null, image_name ?? null, source_remark ?? null, source_table ?? null, source_record_id ?? null, description ?? null, conclusion_id ?? null, req.params.id)
  const row = db.prepare('SELECT * FROM backup_gaps WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM backup_gaps WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '备份缺口未找到' })
    return
  }
  db.prepare('DELETE FROM backup_gaps WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
