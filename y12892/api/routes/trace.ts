import { Router, type Request, type Response } from 'express'
import {
  getBatchById,
  getParametersByBatchId,
  getRawDataByBatchId,
  getProcessingRecordsByBatchId,
  getCorrectionsByBatchId,
  getOpinionsByBatchId,
} from '../db.js'

const router = Router()

router.get('/:batchId', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const records = getProcessingRecordsByBatchId(batchId)
  const params = getParametersByBatchId(batchId)
  const rawData = getRawDataByBatchId(batchId)

  const latestRecord = records.length > 0 ? records[records.length - 1] : null
  const latestParams = params.length > 0 ? params[params.length - 1] : null
  const latestRaw = rawData.length > 0 ? rawData[rawData.length - 1] : null

  res.status(200).json({
    success: true,
    data: {
      batchId,
      result: latestRecord
        ? {
            processingRecordId: latestRecord.id,
            algorithm: latestRecord.algorithm,
            riskLevel: latestRecord.riskLevel,
            waterQualityAlert: latestRecord.waterQualityAlert,
            timestamp: latestRecord.createdAt,
          }
        : null,
      parameters: latestParams
        ? {
            hs: latestParams.hs,
            tp: latestParams.tp,
            spectrumType: latestParams.spectrumType,
            windWaveRatio: latestParams.windWaveRatio,
            swellRatio: latestParams.swellRatio,
            dominantDirection: latestParams.dominantDirection,
          }
        : null,
      rawData: latestRaw
        ? {
            id: latestRaw.id,
            buoyData: latestRaw.buoyData,
            forecastData: latestRaw.forecastData,
            inspectionPhotos: latestRaw.inspectionPhotos,
            buoyOfflineEvents: latestRaw.buoyOfflineEvents,
          }
        : null,
      processingRecord: latestRecord
        ? {
            id: latestRecord.id,
            inputSummary: latestRecord.inputSummary,
            algorithm: latestRecord.algorithm,
          }
        : null,
    },
  })
})

router.get('/:batchId/anomaly', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const corrections = getCorrectionsByBatchId(batchId)
  const opinions = getOpinionsByBatchId(batchId)
  const records = getProcessingRecordsByBatchId(batchId)

  const shipTrajectories = opinions
    .filter((o: any) => o.shipTrajectory)
    .map((o: any) => ({
      opinionId: o.id,
      shipTrajectory: o.shipTrajectory,
      submittedAt: o.createdAt,
      submittedBy: o.submittedBy,
    }))

  res.status(200).json({
    success: true,
    data: {
      batchId,
      shipTrajectories,
      processingOpinions: opinions.map((o: any) => ({
        id: o.id,
        opinion: o.opinion,
        submittedBy: o.submittedBy,
        submittedAt: o.createdAt,
      })),
      corrections: corrections.map((c: any) => ({
        id: c.id,
        correctedForecast: c.correctedForecast,
        reason: c.reason,
        correctedBy: c.correctedBy,
        createdAt: c.createdAt,
      })),
      reviewRecords: records.map((r: any) => ({
        id: r.id,
        algorithm: r.algorithm,
        riskLevel: r.riskLevel,
        waterQualityAlert: r.waterQualityAlert,
        createdAt: r.createdAt,
      })),
    },
  })
})

export default router
