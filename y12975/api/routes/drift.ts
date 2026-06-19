import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { status, confidence, sourceType, q } = req.query
  let sql = 'SELECT * FROM drift_records WHERE 1=1'
  const params: unknown[] = []

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (confidence) {
    sql += ' AND confidence = ?'
    params.push(confidence)
  }
  if (sourceType) {
    sql += ' AND source_type = ?'
    params.push(sourceType)
  }
  if (q) {
    sql += ' AND (table_name LIKE ? OR field_name LIKE ? OR current_enum LIKE ? OR expected_enum LIKE ?)'
    const like = `%${q}%`
    params.push(like, like, like, like)
  }

  sql += ' ORDER BY created_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

router.get('/:id', (req: Request, res: Response) => {
  const drift = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!drift) {
    res.status(404).json({ ok: false, error: 'Drift record not found' })
    return
  }

  let snapshot = null
  if (drift.snapshot_id) {
    snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(drift.snapshot_id)
  }

  const conclusionRefs = db.prepare('SELECT * FROM conclusion_refs WHERE drift_id = ?').all(drift.id)
  const audits = db.prepare('SELECT * FROM permission_audit WHERE drift_id = ?').all(drift.id)
  const slowQueries = db.prepare('SELECT * FROM slow_query_attribution WHERE drift_id = ?').all(drift.id)

  res.json({
    ok: true,
    data: {
      ...drift,
      snapshot,
      conclusion_refs: conclusionRefs,
      permission_audits: audits,
      slow_queries: slowQueries,
    },
  })
})

router.post('/:id/correct', (req: Request, res: Response) => {
  const { expectedEnum, note, materialIds, operator } = req.body
  const drift = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!drift) {
    res.status(404).json({ ok: false, error: 'Drift record not found' })
    return
  }

  const now = new Date().toISOString()
  const beforeState = JSON.stringify({ expected_enum: drift.expected_enum, status: drift.status, conclusion: drift.conclusion })
  const afterState = JSON.stringify({ expected_enum: expectedEnum, status: 'corrected', conclusion: note })

  db.prepare(
    'UPDATE drift_records SET expected_enum = ?, conclusion = ?, status = ?, updated_at = ?, operator = ? WHERE id = ?'
  ).run(expectedEnum, note, 'corrected', now, operator || null, req.params.id)

  db.prepare(
    'INSERT INTO correction_history (id, drift_id, action, before_state, after_state, operator, action_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), req.params.id, 'correct', beforeState, afterState, operator || null, now, note || null)

  if (Array.isArray(materialIds)) {
    for (const mid of materialIds) {
      db.prepare(
        'INSERT INTO conclusion_refs (id, drift_id, material_id, ref_role) VALUES (?, ?, ?, ?)'
      ).run(uuidv4(), req.params.id, mid, 'supporting')
    }
  }

  const updated = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id)
  res.json({ ok: true, data: updated })
})

router.post('/:id/review', (req: Request, res: Response) => {
  const { reviewed, operator } = req.body
  const drift = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!drift) {
    res.status(404).json({ ok: false, error: 'Drift record not found' })
    return
  }

  const now = new Date().toISOString()
  const newStatus = reviewed ? 'confirmed' : 'dismissed'
  const beforeState = JSON.stringify({ status: drift.status })
  const afterState = JSON.stringify({ status: newStatus })

  db.prepare('UPDATE drift_records SET status = ?, updated_at = ?, operator = ? WHERE id = ?').run(newStatus, now, operator || null, req.params.id)

  db.prepare(
    'INSERT INTO correction_history (id, drift_id, action, before_state, after_state, operator, action_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), req.params.id, 'review', beforeState, afterState, operator || null, now, `Reviewed as ${newStatus}`)

  const updated = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id)
  res.json({ ok: true, data: updated })
})

router.post('/:id/rollback', (req: Request, res: Response) => {
  const drift = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!drift) {
    res.status(404).json({ ok: false, error: 'Drift record not found' })
    return
  }

  const { operator, conclusion, sourceMaterialIds } = req.body
  const now = new Date().toISOString()

  db.prepare('UPDATE drift_records SET status = ?, updated_at = ?, operator = ? WHERE id = ?').run('rolled_back', now, operator || null, req.params.id)

  db.prepare(
    'INSERT INTO rollback_records (id, rollback_at, drift_id, conclusion, operator, source_material_ids) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), now, req.params.id, conclusion || null, operator || null, sourceMaterialIds || null)

  db.prepare(
    'INSERT INTO correction_history (id, drift_id, action, before_state, after_state, operator, action_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), req.params.id, 'rollback', JSON.stringify({ status: drift.status }), JSON.stringify({ status: 'rolled_back' }), operator || null, now, conclusion || null)

  const updated = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id)
  res.json({ ok: true, data: updated })
})

router.get('/:id/conclusion', (req: Request, res: Response) => {
  const drift = db.prepare('SELECT * FROM drift_records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!drift) {
    res.status(404).json({ ok: false, error: 'Drift record not found' })
    return
  }

  const refs = db.prepare('SELECT * FROM conclusion_refs WHERE drift_id = ?').all(drift.id) as Record<string, unknown>[]
  const materials = refs.map(ref => {
    return db.prepare('SELECT * FROM source_materials WHERE id = ?').get(ref.material_id as string)
  })

  res.json({
    ok: true,
    data: {
      drift,
      conclusion: drift.conclusion,
      conclusion_refs: refs,
      materials,
    },
  })
})

export default router
