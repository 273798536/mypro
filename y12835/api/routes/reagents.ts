import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import type { ReagentBatch, CryoRecord, MicroPhoto, ReagentTraceResponse } from '../types.js'

const router = Router()

router.get('/:batchNumber/trace', (req: Request, res: Response): void => {
  const db = getDb()
  const { batchNumber } = req.params

  const batch = db.prepare('SELECT * FROM reagent_batches WHERE batch_number = ?').get(batchNumber) as ReagentBatch | undefined
  if (!batch) {
    res.status(404).json({ success: false, error: `未找到批号为"${batchNumber}"的试剂批次，请确认批号是否正确` })
    return
  }

  const records = db.prepare(
    'SELECT * FROM cryo_records WHERE reagent_batch_id = ? ORDER BY date'
  ).all(batch.id) as CryoRecord[]

  const linkedRecords = records.map(record => {
    const photos = db.prepare('SELECT * FROM micro_photos WHERE record_id = ?').all(record.id) as MicroPhoto[]
    return {
      record,
      conclusion: record.conclusion,
      photos,
    }
  })

  const summary = {
    success: records.filter(r => r.conclusion === 'success').length,
    failed: records.filter(r => r.conclusion === 'failed').length,
    pending: records.filter(r => r.conclusion === 'pending').length,
  }

  const response: ReagentTraceResponse = {
    batch,
    linked_records: linkedRecords,
    conclusion_summary: summary,
  }

  res.json({ success: true, data: response })
})

export default router
