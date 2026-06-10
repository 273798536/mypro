import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query
  let rows: any[]
  if (status && typeof status === 'string') {
    rows = db.prepare('SELECT * FROM anomalies WHERE status = ? ORDER BY created_at DESC').all(status)
  } else {
    rows = db.prepare('SELECT * FROM anomalies ORDER BY created_at DESC').all()
  }
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response): void => {
  const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id) as any
  if (!anomaly) {
    res.status(404).json({ success: false, error: '异常记录未找到' })
    return
  }
  const reviews = db.prepare('SELECT * FROM review_actions WHERE anomaly_id = ? ORDER BY operated_at ASC').all(req.params.id)
  const readQuality = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ? AND read_id = ?').get(anomaly.batch_id, anomaly.read_id)
  const culture = anomaly.culture_record_id
    ? db.prepare('SELECT * FROM culture_records WHERE id = ?').get(anomaly.culture_record_id)
    : null
  res.json({
    success: true,
    data: {
      ...anomaly,
      review_actions: reviews,
      read_quality: readQuality ?? null,
      culture_record: culture ?? null,
    },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { readId, batchId, createdBy = '系统', cultureRecordId } = req.body
  if (!batchId || !readId) {
    res.status(400).json({ success: false, error: 'readId和batchId不能为空' })
    return
  }

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  const createAnomaly = db.transaction(() => {
    db.prepare(`
      INSERT INTO anomalies (id, batch_id, read_id, culture_record_id, status, created_by, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, batchId, readId, cultureRecordId ?? null, createdBy, now)

    db.prepare(`
      UPDATE read_qualities SET anomaly_id = ? WHERE read_id = ? AND batch_id = ?
    `).run(id, readId, batchId)

    db.prepare(`
      UPDATE batches SET anomaly_count = anomaly_count + 1 WHERE id = ?
    `).run(batchId)

    db.prepare(`
      INSERT INTO processing_records (id, batch_id, anomaly_id, culture_record_id, action, operator, operated_at, reason)
      VALUES (?, ?, ?, ?, '标记异常', ?, ?, '技师发起异常复核申请')
    `).run(uuidv4(), batchId, id, cultureRecordId ?? null, createdBy, now)
  })

  createAnomaly()

  const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: anomaly })
})

router.post('/:id/review', (req: Request, res: Response): void => {
  const { action, reason, operator } = req.body
  if (!action || !reason || !operator) {
    res.status(400).json({ success: false, error: 'action、reason和operator不能为空' })
    return
  }
  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json({ success: false, error: 'action必须是approve或reject' })
    return
  }

  const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id) as any
  if (!anomaly) {
    res.status(404).json({ success: false, error: '异常记录未找到' })
    return
  }

  const reviewId = uuidv4()
  const now = new Date().toISOString()
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const actionLabel = action === 'approve' ? '复核通过' : '复核驳回'

  const submitReview = db.transaction(() => {
    db.prepare(`
      INSERT INTO review_actions (id, anomaly_id, action, reason, operator, operated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reviewId, req.params.id, action, reason, operator, now)

    db.prepare('UPDATE anomalies SET status = ? WHERE id = ?').run(newStatus, req.params.id)

    db.prepare(`
      INSERT INTO processing_records (id, batch_id, anomaly_id, culture_record_id, action, operator, operated_at, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), anomaly.batch_id, req.params.id, anomaly.culture_record_id, actionLabel, operator, now, reason)

    const batch = db.prepare('SELECT id, status FROM batches WHERE id = ?').get(anomaly.batch_id) as any
    if (batch && batch.status === 'pending') {
      db.prepare("UPDATE batches SET status = 'in_progress' WHERE id = ?").run(anomaly.batch_id)
    }
  })

  submitReview()

  const review = db.prepare('SELECT * FROM review_actions WHERE id = ?').get(reviewId)
  res.status(201).json({ success: true, data: review })
})

router.get('/:id/history', (req: Request, res: Response): void => {
  const anomaly = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id) as any
  if (!anomaly) {
    res.status(404).json({ success: false, error: '异常记录未找到' })
    return
  }
  const reviews = db.prepare('SELECT * FROM review_actions WHERE anomaly_id = ? ORDER BY operated_at ASC').all(req.params.id)
  res.json({ success: true, data: reviews })
})

export default router
