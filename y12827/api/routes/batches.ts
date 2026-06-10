import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query
  let rows: any[]
  if (status && typeof status === 'string') {
    rows = db.prepare('SELECT * FROM batches WHERE status = ? ORDER BY run_at DESC').all(status)
  } else {
    rows = db.prepare('SELECT * FROM batches ORDER BY run_at DESC').all()
  }
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response): void => {
  const row = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', (req: Request, res: Response): void => {
  const { name, totalReads = 20, createdBy = '系统' } = req.body
  if (!name) {
    res.status(400).json({ success: false, error: '批次名称不能为空' })
    return
  }

  const batchId = uuidv4()
  const now = new Date().toISOString()
  const lowQualityThreshold = 20
  const lowQualityReasons = [
    { category: '低平均质量', explanation: '该读段平均质量分数低于阈值20，可能源于测序仪光学系统校准偏差' },
    { category: '3\'端质量衰减', explanation: '3\'端连续碱基质量值低于15，提示样本降解或测序试剂老化' },
    { category: '高N率', explanation: '该读段N碱基占比超过阈值5%，疑为测序flow cell气泡干扰所致' },
  ]

  let lowQualityCount = 0
  const insertRead = db.prepare(`
    INSERT INTO read_qualities (id, batch_id, read_id, quality_score, is_low_quality, reason_category, reason_explanation, anomaly_id)
    VALUES (@id, @batch_id, @read_id, @quality_score, @is_low_quality, @reason_category, @reason_explanation, @anomaly_id)
  `)

  const createBatch = db.transaction(() => {
    db.prepare(`
      INSERT INTO batches (id, name, run_at, total_reads, low_quality_reads, anomaly_count, status)
      VALUES (?, ?, ?, ?, 0, 0, 'pending')
    `).run(batchId, name, now, totalReads)

    for (let i = 1; i <= totalReads; i++) {
      const qualityScore = Math.round((Math.random() * 35 + 5) * 10) / 10
      const isLow = qualityScore < lowQualityThreshold
      if (isLow) lowQualityCount++
      const reason = isLow ? lowQualityReasons[Math.floor(Math.random() * lowQualityReasons.length)] : null
      insertRead.run({
        id: uuidv4(),
        batch_id: batchId,
        read_id: `${name}-READ-${String(i).padStart(3, '0')}`,
        quality_score: qualityScore,
        is_low_quality: isLow ? 1 : 0,
        reason_category: reason?.category ?? null,
        reason_explanation: reason?.explanation ?? null,
        anomaly_id: null,
      })
    }

    db.prepare(`
      UPDATE batches SET low_quality_reads = ? WHERE id = ?
    `).run(lowQualityCount, batchId)
  })

  createBatch()

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId)
  res.status(201).json({ success: true, data: batch })
})

export default router
