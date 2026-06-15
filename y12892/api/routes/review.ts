import { Router, type Request, type Response } from 'express'
import {
  getBatchById,
  getRawDataByBatchId,
  getCorrectionsByBatchId,
  createCorrection,
  getOpinionsByBatchId,
  createOpinion,
} from '../db.js'

const router = Router()

router.get('/:batchId', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const rawData = getRawDataByBatchId(batchId)
  const corrections = getCorrectionsByBatchId(batchId)
  const opinions = getOpinionsByBatchId(batchId)

  const buoyData = rawData.length > 0 ? rawData[rawData.length - 1].buoyData : null
  const inspectionPhotos = rawData.length > 0 ? (rawData[rawData.length - 1].inspectionPhotos || []) : []
  const buoyOfflineEvents = rawData.length > 0 ? (rawData[rawData.length - 1].buoyOfflineEvents || []) : []
  const forecastData = rawData.length > 0 ? (rawData[rawData.length - 1].forecastData || null) : null

  const lateForecast = forecastData && forecastData.isLate
    ? {
        arrivalTime: forecastData.arrivalTime,
        isLate: forecastData.isLate,
        forecastWaveHeight: forecastData.forecastWaveHeight,
        forecastPeriod: forecastData.forecastPeriod,
        forecastDirection: forecastData.forecastDirection,
      }
    : null

  res.status(200).json({
    success: true,
    data: {
      batchId,
      buoyData,
      inspectionPhotos,
      buoyOfflineEvents,
      lateForecast,
      existingCorrections: corrections,
      existingOpinions: opinions,
    },
  })
})

router.post('/:batchId/correction', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const { correctedForecast, reason, correctedBy } = req.body

  if (!correctedForecast || !reason) {
    res.status(400).json({ success: false, error: '缺少修正预报数据或修正原因' })
    return
  }

  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const correction = createCorrection(batchId, {
    correctedForecast,
    reason,
    correctedBy: correctedBy || 'system',
    type: '风浪预报晚到修正',
  })

  res.status(200).json({ success: true, data: correction })
})

router.post('/:batchId/opinion', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const { opinion, shipTrajectory, submittedBy } = req.body

  if (!opinion) {
    res.status(400).json({ success: false, error: '缺少处理意见' })
    return
  }

  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const opinionEntry = createOpinion(batchId, {
    opinion,
    shipTrajectory: shipTrajectory || null,
    submittedBy: submittedBy || 'system',
  })

  res.status(200).json({ success: true, data: opinionEntry })
})

export default router
