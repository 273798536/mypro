import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/processing-records/:batchId', (req: Request, res: Response): void => {
  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(req.params.batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }
  const records = db.prepare(
    'SELECT * FROM processing_records WHERE batch_id = ? ORDER BY operated_at ASC'
  ).all(req.params.batchId)
  res.json({ success: true, data: records })
})

router.get('/reports/preview/:batchId', (req: Request, res: Response): void => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.batchId) as any
  if (!batch) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }

  const reads = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ?').all(req.params.batchId)
  const anomalies = db.prepare('SELECT * FROM anomalies WHERE batch_id = ?').all(req.params.batchId)
  const processingRecords = db.prepare(
    'SELECT * FROM processing_records WHERE batch_id = ? ORDER BY operated_at ASC'
  ).all(req.params.batchId)

  const anomalyIds = anomalies.map((a: any) => a.id)
  const reviews = anomalyIds.length > 0
    ? db.prepare(`SELECT * FROM review_actions WHERE anomaly_id IN (${anomalyIds.map(() => '?').join(',')}) ORDER BY operated_at ASC`).all(...anomalyIds)
    : []

  const cultureIds = anomalies
    .map((a: any) => a.culture_record_id)
    .filter((id: any): id is string => id !== null)
  const cultures = cultureIds.length > 0
    ? db.prepare(`SELECT * FROM culture_records WHERE id IN (${cultureIds.map(() => '?').join(',')})`).all(...cultureIds)
    : []

  res.json({
    success: true,
    data: {
      batch,
      reads,
      anomalies,
      review_actions: reviews,
      culture_records: cultures,
      processing_records: processingRecords,
      generated_at: new Date().toISOString(),
    },
  })
})

router.get('/reports/download/:batchId', (req: Request, res: Response): void => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.batchId) as any
  if (!batch) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }

  const reads = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ?').all(req.params.batchId)
  const anomalies = db.prepare('SELECT * FROM anomalies WHERE batch_id = ?').all(req.params.batchId)
  const processingRecords = db.prepare(
    'SELECT * FROM processing_records WHERE batch_id = ? ORDER BY operated_at ASC'
  ).all(req.params.batchId)

  const anomalyIds = anomalies.map((a: any) => a.id)
  const reviews = anomalyIds.length > 0
    ? db.prepare(`SELECT * FROM review_actions WHERE anomaly_id IN (${anomalyIds.map(() => '?').join(',')}) ORDER BY operated_at ASC`).all(...anomalyIds)
    : []

  const cultureIds = anomalies
    .map((a: any) => a.culture_record_id)
    .filter((id: any): id is string => id !== null)
  const cultures = cultureIds.length > 0
    ? db.prepare(`SELECT * FROM culture_records WHERE id IN (${cultureIds.map(() => '?').join(',')})`).all(...cultureIds)
    : []

  const reportData = {
    batch,
    reads,
    anomalies,
    review_actions: reviews,
    culture_records: cultures,
    processing_records: processingRecords,
    generated_at: new Date().toISOString(),
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `MCS_${batch.name}_${timestamp}.json`

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(JSON.stringify(reportData, null, 2))
})

export default router
