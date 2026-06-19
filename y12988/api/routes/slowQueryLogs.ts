import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { batch_id } = req.query
  let rows: unknown[]
  if (batch_id) {
    rows = db.prepare('SELECT * FROM slow_query_logs WHERE batch_id = ? ORDER BY created_at DESC').all(batch_id as string)
  } else {
    rows = db.prepare('SELECT * FROM slow_query_logs ORDER BY created_at DESC').all()
  }
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM slow_query_logs WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '慢查询日志未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/import', (req: Request, res: Response) => {
  const db = getDb()
  const { batch_id, logs } = req.body
  if (!batch_id || !Array.isArray(logs) || logs.length === 0) {
    res.status(400).json({ success: false, error: 'batch_id和logs数组必填' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  const currentRound = db.prepare('SELECT MAX(import_round) as max_round FROM slow_query_logs WHERE batch_id = ?').get(batch_id as string) as { max_round: number | null }
  const nextRound = (currentRound.max_round ?? 0) + 1

  const results: unknown[] = []

  const insertLog = db.prepare(`
    INSERT INTO slow_query_logs (id, batch_id, query_text, execution_time_ms, source_file, original_line_no, is_duplicate, import_round, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const checkDuplicate = db.prepare(
    'SELECT id FROM slow_query_logs WHERE batch_id = ? AND query_text = ?'
  )

  const transaction = db.transaction(() => {
    for (const log of logs) {
      const { query_text, execution_time_ms, source_file, original_line_no } = log
      if (!query_text || execution_time_ms == null) continue

      const existing = checkDuplicate.get(batch_id, query_text) as { id: string } | undefined

      if (existing) {
        const dupId = uuidv4()
        insertLog.run(dupId, batch_id, query_text, execution_time_ms, source_file ?? '', original_line_no ?? 0, 1, nextRound, now)
        results.push({ id: dupId, is_duplicate: true, original_id: existing.id })
      } else {
        const newId = uuidv4()
        insertLog.run(newId, batch_id, query_text, execution_time_ms, source_file ?? '', original_line_no ?? 0, 0, nextRound, now)
        results.push({ id: newId, is_duplicate: false })
      }
    }
  })

  transaction()
  res.status(201).json({ success: true, data: results })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { batch_id, query_text, execution_time_ms, source_file, original_line_no } = req.body
  if (!batch_id || !query_text || execution_time_ms == null) {
    res.status(400).json({ success: false, error: 'batch_id、query_text和execution_time_ms必填' })
    return
  }
  const existing = db.prepare('SELECT id FROM slow_query_logs WHERE batch_id = ? AND query_text = ?').get(batch_id, query_text)
  if (existing) {
    const id = uuidv4()
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    const currentRound = db.prepare('SELECT MAX(import_round) as max_round FROM slow_query_logs WHERE batch_id = ?').get(batch_id) as { max_round: number | null }
    const nextRound = (currentRound.max_round ?? 0) + 1
    db.prepare(
      'INSERT INTO slow_query_logs (id, batch_id, query_text, execution_time_ms, source_file, original_line_no, is_duplicate, import_round, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, batch_id, query_text, execution_time_ms, source_file ?? '', original_line_no ?? 0, 1, nextRound, now)
    const row = db.prepare('SELECT * FROM slow_query_logs WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: row })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  db.prepare(
    'INSERT INTO slow_query_logs (id, batch_id, query_text, execution_time_ms, source_file, original_line_no, is_duplicate, import_round, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, batch_id, query_text, execution_time_ms, source_file ?? '', original_line_no ?? 0, 0, 1, now)
  const row = db.prepare('SELECT * FROM slow_query_logs WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: row })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM slow_query_logs WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '慢查询日志未找到' })
    return
  }
  db.prepare('DELETE FROM slow_query_logs WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
