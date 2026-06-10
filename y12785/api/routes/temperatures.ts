import { Router, type Request, type Response } from 'express'
import db, { logOperation } from '../db.js'

const router = Router({ mergeParams: true })

router.post('/', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { records, operator } = req.body

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const inputRecords = records || [req.body]
  const insertStmt = db.prepare(
    'INSERT INTO temperature_records (id, batch_id, timestamp, temperature, is_control_point) VALUES (?, ?, ?, ?, ?)'
  )
  const results: any[] = []

  for (const record of inputRecords) {
    if (record.temperature == null || !record.timestamp) {
      continue
    }
    const id = crypto.randomUUID()
    const isControl = record.is_control_point ? 1 : 0
    insertStmt.run(id, batchId, record.timestamp, record.temperature, isControl)
    results.push({ id, batch_id: batchId, timestamp: record.timestamp, temperature: record.temperature, is_control_point: isControl })
  }

  if (results.length === 0) {
    res.status(400).json({
      code: 'MISSING_FIELD',
      message: '缺少必填字段',
      actionableHint: '请提供 timestamp 和 temperature 字段',
      missingData: ['timestamp', 'temperature'],
    })
    return
  }

  logOperation(batchId, 'ADD_TEMPERATURE', operator || 'system', `添加${results.length}条温度记录`)

  res.status(201).json({ success: true, data: results })
})

router.get('/', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const records = db.prepare('SELECT * FROM temperature_records WHERE batch_id = ? ORDER BY timestamp').all(batchId)
  res.json({ success: true, data: records })
})

export default router
