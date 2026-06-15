import { Router, type Request, type Response } from 'express'
import {
  getBatchById,
  getParametersByBatchId,
  getProcessingRecordsByBatchId,
  getAllBatches,
} from '../db.js'

const router = Router()

router.get('/:batchId', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const params = getParametersByBatchId(batchId)
  const records = getProcessingRecordsByBatchId(batchId)
  const allBatches = getAllBatches()

  const currentIndex = allBatches.findIndex((b: any) => b.id === batchId)
  const previousBatch = currentIndex > 0 ? allBatches[currentIndex - 1] : null

  const filename = `ocean_analysis_${batchId}_${new Date().toISOString().slice(0, 10)}.csv`

  res.status(200).json({
    success: true,
    data: {
      batchId,
      filename,
      batchInfo: {
        id: batch.id,
        createdAt: batch.createdAt,
        status: batch.status,
        riskLevel: records.length > 0 ? records[records.length - 1].riskLevel : null,
        waterQualityAlert: records.length > 0 ? records[records.length - 1].waterQualityAlert : null,
      },
      parameters: params.length > 0 ? params[params.length - 1] : null,
      previousBatch: previousBatch
        ? { id: previousBatch.id, createdAt: previousBatch.createdAt }
        : null,
    },
  })
})

router.get('/:batchId/download', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const format = req.query.format as string

  if (!format || !['csv', 'json'].includes(format)) {
    res.status(400).json({ success: false, error: 'format参数必须为csv或json' })
    return
  }

  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const params = getParametersByBatchId(batchId)
  const records = getProcessingRecordsByBatchId(batchId)

  const latestParams = params.length > 0 ? params[params.length - 1] : null
  const latestRecord = records.length > 0 ? records[records.length - 1] : null

  if (format === 'json') {
    const exportData = {
      batchId,
      timestamp: batch.createdAt,
      parameters: latestParams,
      riskLevel: latestRecord?.riskLevel,
      waterQualityAlert: latestRecord?.waterQualityAlert,
      processingRecordId: latestRecord?.id,
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename=ocean_analysis_${batchId}.json`)
    res.status(200).json(exportData)
    return
  }

  const rows: string[] = []
  rows.push('参数,值,单位,说明')
  if (latestParams) {
    rows.push(`有效波高,${latestParams.hs?.value ?? ''},${latestParams.hs?.unit ?? ''},${latestParams.hs?.explanation ?? ''}`)
    rows.push(`谱峰周期,${latestParams.tp?.value ?? ''},${latestParams.tp?.unit ?? ''},${latestParams.tp?.explanation ?? ''}`)
    rows.push(`谱型,${latestParams.spectrumType?.value ?? ''},,${latestParams.spectrumType?.explanation ?? ''}`)
    rows.push(`风浪比,${latestParams.windWaveRatio?.value ?? ''},,${latestParams.windWaveRatio?.explanation ?? ''}`)
    rows.push(`涌浪比,${latestParams.swellRatio?.value ?? ''},,${latestParams.swellRatio?.explanation ?? ''}`)
    rows.push(`主波向,${latestParams.dominantDirection?.value ?? ''},${latestParams.dominantDirection?.unit ?? ''},${latestParams.dominantDirection?.explanation ?? ''}`)
  }
  rows.push(`风险等级,${latestRecord?.riskLevel ?? ''},,`)
  rows.push(`水质预警,${latestRecord?.waterQualityAlert ?? ''},,`)

  const csvContent = rows.join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=ocean_analysis_${batchId}.csv`)
  res.status(200).send('\uFEFF' + csvContent)
})

export default router
