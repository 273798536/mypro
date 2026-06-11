import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import { checkDuplicates, resolveImport } from '../services/duplicateChecker.js'
import { runAllDetectors } from '../services/anomalyDetector.js'
import type { ImportRequest, CreateRecordRequest } from '../types.js'

const router = Router()

router.post('/check', (req: Request, res: Response): void => {
  const { records } = req.body as { records: CreateRecordRequest[] }

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ success: false, error: '请提供要检查的记录数组，字段records不能为空' })
    return
  }

  for (const r of records) {
    if (!r.cell_line || !r.date || !r.type || r.passage_number === undefined) {
      res.status(400).json({ success: false, error: '每条记录必须包含cell_line、date、type、passage_number用于重复检测' })
      return
    }
  }

  const result = checkDuplicates(records)
  res.json({ success: true, data: result })
})

router.post('/', (req: Request, res: Response): void => {
  const body = req.body as { records: CreateRecordRequest[]; resolution?: string; resolutions?: Record<string, 'skip' | 'overwrite' | 'new'> }
  const records = body.records
  const globalResolution = (body.resolution ?? 'skip') as 'skip' | 'overwrite' | 'new'
  const resolutions = body.resolutions

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ success: false, error: '请提供要导入的记录数组，字段records不能为空' })
    return
  }

  if (!resolutions && !['skip', 'overwrite', 'new'].includes(globalResolution)) {
    res.status(400).json({ success: false, error: 'resolution必须为skip、overwrite或new，或提供按索引指定的resolutions对象' })
    return
  }
  if (resolutions) {
    for (const v of Object.values(resolutions)) {
      if (!['skip', 'overwrite', 'new'].includes(v)) {
        res.status(400).json({ success: false, error: 'resolutions中的每条策略必须为skip、overwrite或new' })
        return
      }
    }
  }

  for (const r of records) {
    if (!r.type || !r.cell_line || !r.operator || !r.date || !r.reagent_batch_id) {
      res.status(400).json({ success: false, error: '每条记录必须包含type、cell_line、operator、date、reagent_batch_id' })
      return
    }
  }

  const db = getDb()
  const anomalyIds: string[] = []

  const result = resolveImport(records, globalResolution as 'skip' | 'overwrite' | 'new', resolutions)

  for (const id of [...result.imported_ids, ...result.overwritten_ids]) {
    const anomalies = runAllDetectors(id)
    anomalyIds.push(...anomalies.anomaly_ids)
  }

  res.json({
    success: true,
    data: {
      imported_count: result.imported,
      skipped_count: result.skipped,
      overwritten_count: result.overwritten,
      imported_ids: result.imported_ids,
      overwritten_ids: result.overwritten_ids,
      new_anomaly_count: anomalyIds.length,
      anomaly_detected_ids: anomalyIds,
    },
  })
})

export default router
