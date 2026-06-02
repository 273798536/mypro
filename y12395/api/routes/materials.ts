import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { type, version } = req.query

    let sql = 'SELECT * FROM source_materials WHERE 1=1'
    const params: unknown[] = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (version) {
      sql += ' AND version = ?'
      params.push(version)
    }

    sql += ' ORDER BY created_at DESC'

    const materials = db.prepare(sql).all(...params)
    res.json({ success: true, data: materials })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch materials' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const items = Array.isArray(req.body) ? req.body : [req.body]

    const insert = db.prepare(`
      INSERT INTO source_materials (id, type, title, content, source_file, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction(() => {
      const results = []
      for (const item of items) {
        const id = uuidv4()
        insert.run(id, item.type, item.title, item.content, item.source_file, item.version)
        results.push({ id, ...item })
      }
      return results
    })

    const results = transaction()
    res.status(201).json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to import materials' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const material = db.prepare('SELECT * FROM source_materials WHERE id = ?').get(id)
    if (!material) {
      res.status(404).json({ success: false, error: 'Material not found' })
      return
    }

    const mappings = db.prepare(`
      SELECT sam.*, sm.title as mapped_title, sm.type as mapped_type, sm.version as mapped_version
      FROM score_annotation_mapping sam
      LEFT JOIN source_materials sm ON (
        (sam.score_id = ? AND sm.id = sam.annotation_id)
        OR (sam.annotation_id = ? AND sm.id = sam.score_id)
      )
      WHERE sam.score_id = ? OR sam.annotation_id = ?
    `).all(id, id, id, id)

    const snapshots = db.prepare(`
      SELECT * FROM change_snapshots
      WHERE entity_type = 'source_material' AND entity_id = ?
      ORDER BY created_at DESC
    `).all(id)

    res.json({
      success: true,
      data: {
        ...(material as Record<string, unknown>),
        mappings,
        change_history: snapshots,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch material' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const existing = db.prepare('SELECT * FROM source_materials WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!existing) {
      res.status(404).json({ success: false, error: 'Material not found' })
      return
    }

    const { title, content, source_file, version, type, reason } = req.body
    const updates: Record<string, unknown> = {}
    const fields = { title, content, source_file, version, type }

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== existing[key]) {
        updates[key] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      res.json({ success: true, data: existing })
      return
    }

    const transaction = db.transaction(() => {
      const insertSnapshot = db.prepare(`
        INSERT INTO change_snapshots (id, entity_type, entity_id, field, old_value, new_value, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      for (const [field, newValue] of Object.entries(updates)) {
        insertSnapshot.run(
          uuidv4(),
          'source_material',
          id,
          field,
          String(existing[field] ?? ''),
          String(newValue),
          reason ?? null,
        )
      }

      const setClauses = Object.keys(updates).map((key) => `${key} = ?`).join(', ')
      const values = [...Object.values(updates), id]

      db.prepare(`UPDATE source_materials SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values)
    })

    transaction()

    const updated = db.prepare('SELECT * FROM source_materials WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update material' })
  }
})

export default router
