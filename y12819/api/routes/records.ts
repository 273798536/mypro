import { Router, type Request, type Response } from 'express'
import { db, checkAndCreateAnomaly } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { group, status, search, location } = req.query

  let sql = 'SELECT * FROM culture_records WHERE 1=1'
  const params: unknown[] = []

  if (group) {
    sql += ' AND experiment_group = ?'
    params.push(group)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (location) {
    sql += ' AND sampling_location = ?'
    params.push(location)
  }
  if (search) {
    sql += ' AND (animal_id LIKE ? OR reagent_batch LIKE ? OR expected_batch LIKE ?)'
    const term = `%${search}%`
    params.push(term, term, term)
  }

  sql += ' ORDER BY created_at DESC'

  const records = db.prepare(sql).all(...params)
  res.json({ success: true, data: records })
})

router.get('/:id', (req: Request, res: Response): void => {
  const record = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(req.params.id) as Record<string, unknown>
  const anomalies = db.prepare('SELECT * FROM anomalies WHERE record_id = ?').all(req.params.id)
  res.json({ success: true, data: { ...record, anomalies } })
})

router.post('/', (req: Request, res: Response): void => {
  const { animal_id, experiment_group, sampling_location, reagent_batch, expected_batch, culture_date } = req.body

  if (!animal_id || !experiment_group || !reagent_batch || !expected_batch || !culture_date) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  let status = 'normal'
  if (reagent_batch !== expected_batch) {
    status = 'anomaly'
  } else if (!sampling_location) {
    status = 'pending_review'
  }

  const result = db.prepare(
    `INSERT INTO culture_records (animal_id, experiment_group, sampling_location, reagent_batch, expected_batch, culture_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(animal_id, experiment_group, sampling_location ?? null, reagent_batch, expected_batch, culture_date, status)

  const recordId = result.lastInsertRowid as number

  checkAndCreateAnomaly(recordId, reagent_batch, expected_batch, sampling_location ?? null, animal_id)

  const record = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(recordId)
  res.status(201).json({ success: true, data: record })
})

router.put('/:id', (req: Request, res: Response): void => {
  const existing = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!existing) {
    res.status(404).json({ success: false, error: '记录不存在' })
    return
  }

  const {
    animal_id = existing.animal_id,
    experiment_group = existing.experiment_group,
    sampling_location = existing.sampling_location,
    reagent_batch = existing.reagent_batch,
    expected_batch = existing.expected_batch,
    culture_date = existing.culture_date,
  } = req.body

  db.prepare(
    `UPDATE culture_records
     SET animal_id = ?, experiment_group = ?, sampling_location = ?, reagent_batch = ?,
         expected_batch = ?, culture_date = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(animal_id, experiment_group, sampling_location ?? null, reagent_batch, expected_batch, culture_date, req.params.id)

  const locationChanged = sampling_location !== existing.sampling_location
  const batchChanged = reagent_batch !== existing.reagent_batch || expected_batch !== existing.expected_batch

  if (locationChanged || batchChanged) {
    db.prepare('DELETE FROM anomalies WHERE record_id = ? AND status = ?').run(req.params.id, 'pending')
  }

  const hasAnomaly = checkAndCreateAnomaly(
    Number(req.params.id),
    reagent_batch as string,
    expected_batch as string,
    (sampling_location as string) ?? null,
    animal_id as string
  )

  let status = 'normal'
  if (hasAnomaly) {
    status = reagent_batch !== expected_batch ? 'anomaly' : 'pending_review'
  }

  db.prepare('UPDATE culture_records SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, req.params.id)

  const record = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(req.params.id) as Record<string, unknown>
  const anomalies = db.prepare('SELECT * FROM anomalies WHERE record_id = ?').all(req.params.id)

  res.json({ success: true, data: { ...record, anomalies } })
})

router.post('/validate', (req: Request, res: Response): void => {
  const { ids } = req.body as { ids: number[] }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请提供要校验的记录ID列表' })
    return
  }

  const placeholders = ids.map(() => '?').join(',')
  const records = db.prepare(`SELECT * FROM culture_records WHERE id IN (${placeholders})`).all(...ids) as Record<string, unknown>[]

  const valid: Record<string, unknown>[] = []
  const batchMismatch: Record<string, unknown>[] = []
  const locationMissing: Record<string, unknown>[] = []

  for (const record of records) {
    const issues: string[] = []

    if (record.reagent_batch !== record.expected_batch) {
      issues.push('batch_mismatch')
      batchMismatch.push(record)
    }

    if (!record.sampling_location) {
      issues.push('data_missing')
      locationMissing.push(record)
    }

    if (issues.length === 0) {
      valid.push(record)
    }
  }

  res.json({
    success: true,
    data: {
      total: records.length,
      valid: { count: valid.length, records: valid },
      batch_mismatch: { count: batchMismatch.length, records: batchMismatch },
      location_missing: { count: locationMissing.length, records: locationMissing },
    },
  })
})

export default router
