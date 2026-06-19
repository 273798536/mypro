import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { type, complete } = req.query
  let sql = 'SELECT * FROM source_materials WHERE 1=1'
  const params: unknown[] = []

  if (type) {
    sql += ' AND material_type = ?'
    params.push(type)
  }
  if (complete !== undefined) {
    sql += ' AND complete = ?'
    params.push(complete === '1' || complete === 'true' ? 1 : 0)
  }

  sql += ' ORDER BY fetched_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

router.post('/ingest', (req: Request, res: Response) => {
  const { materialType, materialRef, title, summary, rawPayload, fetchedAt, complete, dedupKey } = req.body

  const existing = db.prepare('SELECT id FROM source_materials WHERE dedup_key = ?').get(dedupKey) as Record<string, unknown> | undefined
  if (existing) {
    res.json({ ok: true, data: { id: existing.id, skipped: true } })
    return
  }

  const id = uuidv4()
  const now = fetchedAt || new Date().toISOString()
  db.prepare(
    'INSERT INTO source_materials (id, material_type, material_ref, title, summary, raw_payload, fetched_at, complete, dedup_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, materialType, materialRef, title || null, summary || null, rawPayload || null, now, complete !== undefined ? (complete ? 1 : 0) : 1, dedupKey)

  const row = db.prepare('SELECT * FROM source_materials WHERE id = ?').get(id)
  res.json({ ok: true, data: row })
})

router.post('/ingest-batch', (req: Request, res: Response) => {
  const { items } = req.body as { items: Array<Record<string, unknown>> }
  if (!Array.isArray(items)) {
    res.status(400).json({ ok: false, error: 'items must be an array' })
    return
  }

  let ingested = 0
  let skipped = 0

  const insertStmt = db.prepare(
    'INSERT INTO source_materials (id, material_type, material_ref, title, summary, raw_payload, fetched_at, complete, dedup_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const checkStmt = db.prepare('SELECT id FROM source_materials WHERE dedup_key = ?')

  const transaction = db.transaction(() => {
    for (const item of items) {
      const dedupKey = item.dedupKey as string
      const existing = checkStmt.get(dedupKey) as Record<string, unknown> | undefined
      if (existing) {
        skipped++
        continue
      }
      const id = uuidv4()
      const now = (item.fetchedAt as string) || new Date().toISOString()
      insertStmt.run(
        id,
        item.materialType,
        item.materialRef,
        item.title || null,
        item.summary || null,
        item.rawPayload || null,
        now,
        item.complete !== undefined ? (item.complete ? 1 : 0) : 1,
        dedupKey,
      )
      ingested++
    }
  })

  transaction()

  res.json({ ok: true, data: { ingested, skipped, total: items.length } })
})

export default router
