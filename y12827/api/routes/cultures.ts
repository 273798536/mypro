import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const rows = db.prepare('SELECT * FROM culture_records ORDER BY updated_at DESC').all()
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response): void => {
  const record = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(req.params.id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '培养记录未找到' })
    return
  }
  const currentVersion = db.prepare(
    'SELECT * FROM culture_record_versions WHERE record_id = ? AND version = ?'
  ).get(req.params.id, record.current_version)
  res.json({ success: true, data: { ...record, currentVersion } })
})

router.post('/', (req: Request, res: Response): void => {
  const { sampleId, conclusion, updatedBy = '系统', changeReason = '初始创建' } = req.body
  if (!sampleId || !conclusion) {
    res.status(400).json({ success: false, error: 'sampleId和conclusion不能为空' })
    return
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  const createRecord = db.transaction(() => {
    db.prepare(`
      INSERT INTO culture_records (id, sample_id, conclusion, current_version, updated_at, updated_by)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, sampleId, conclusion, now, updatedBy)

    db.prepare(`
      INSERT INTO culture_record_versions (id, record_id, version, conclusion, changed_by, changed_at, change_reason)
      VALUES (?, ?, 1, ?, ?, ?, ?)
    `).run(uuidv4(), id, conclusion, updatedBy, now, changeReason)
  })

  createRecord()

  const record = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: record })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { conclusion, changedBy = '系统', changeReason = '更新结论', batchId, anomalyId } = req.body
  if (!conclusion) {
    res.status(400).json({ success: false, error: 'conclusion不能为空' })
    return
  }
  if (!changeReason || changeReason.trim() === '') {
    res.status(400).json({ success: false, error: '修改原因(changeReason)不能为空，审计留痕需要' })
    return
  }

  const record = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(req.params.id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '培养记录未找到' })
    return
  }

  const newVersion = record.current_version + 1
  const now = new Date().toISOString()

  const updateRecord = db.transaction(() => {
    db.prepare(`
      INSERT INTO culture_record_versions (id, record_id, version, conclusion, changed_by, changed_at, change_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, newVersion, conclusion, changedBy, now, changeReason)

    db.prepare(`
      UPDATE culture_records SET conclusion = ?, current_version = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `).run(conclusion, newVersion, now, changedBy, req.params.id)

    if (batchId) {
      db.prepare(`
        INSERT INTO processing_records (id, batch_id, anomaly_id, culture_record_id, action, operator, operated_at, reason)
        VALUES (?, ?, ?, ?, '培养记录更新', ?, ?, ?)
      `).run(uuidv4(), batchId, anomalyId ?? null, req.params.id, changedBy, now,
        `${changeReason}（v${record.current_version}→v${newVersion}）`)
    }
  })

  updateRecord()

  const updated = db.prepare('SELECT * FROM culture_records WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id/versions', (req: Request, res: Response): void => {
  const record = db.prepare('SELECT id FROM culture_records WHERE id = ?').get(req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: '培养记录未找到' })
    return
  }
  const versions = db.prepare(
    'SELECT * FROM culture_record_versions WHERE record_id = ? ORDER BY version ASC'
  ).all(req.params.id)
  res.json({ success: true, data: versions })
})

router.get('/:id/diff', (req: Request, res: Response): void => {
  const { v1, v2 } = req.query
  if (!v1 || !v2) {
    res.status(400).json({ success: false, error: '必须提供v1和v2版本号' })
    return
  }

  const record = db.prepare('SELECT id FROM culture_records WHERE id = ?').get(req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: '培养记录未找到' })
    return
  }

  const version1 = db.prepare(
    'SELECT * FROM culture_record_versions WHERE record_id = ? AND version = ?'
  ).get(req.params.id, Number(v1))
  const version2 = db.prepare(
    'SELECT * FROM culture_record_versions WHERE record_id = ? AND version = ?'
  ).get(req.params.id, Number(v2))

  if (!version1 || !version2) {
    res.status(404).json({ success: false, error: '指定版本未找到' })
    return
  }

  res.json({ success: true, data: { version1, version2 } })
})

export default router
