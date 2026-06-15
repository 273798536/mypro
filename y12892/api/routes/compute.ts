import { Router, type Request, type Response } from 'express'
import {
  createBatch,
  getBatchById,
  createParameters,
  createProcessingRecord,
  createRawData,
  getProcessingRecordsByBatchId,
  getParametersByBatchId,
} from '../db.js'

const router = Router()

function computeJONSWAP(hs: number, tp: number) {
  const gamma = 3.3
  const fp = 1 / tp
  const alpha = 0.0081
  const spectrumType = hs > 2.0 ? 'JONSWAP-风暴' : 'JONSWAP-常规'
  const spectrumExplanation = hs > 2.0
    ? `有效波高${hs}m超过2m阈值，海浪谱呈现风暴态JONSWAP谱特征，谱峰增强因子γ=${gamma}。`
    : `有效波高${hs}m在正常范围，海浪谱符合标准JONSWAP谱，谱峰增强因子γ=${gamma}。`
  return { spectrumType, spectrumExplanation, gamma, fp, alpha }
}

function computeWindSwellRatio(windSpeed: number, hs: number, tp: number) {
  const windWaveRatio = Math.min(1, windSpeed / (hs * 10 + 1))
  const swellRatio = 1 - windWaveRatio
  const windExplanation = `风速${windSpeed}m/s下风浪占比${(windWaveRatio * 100).toFixed(1)}%，风浪成分${windWaveRatio > 0.5 ? '主导' : '较弱'}。`
  const swellExplanation = `涌浪占比${(swellRatio * 100).toFixed(1)}%，谱峰周期${tp}s表明涌浪${swellRatio > 0.5 ? '为主要成分' : '贡献较小'}。`
  return { windWaveRatio, swellRatio, windExplanation, swellExplanation }
}

function assessRisk(hs: number): "low" | "medium" | "high" {
  if (hs < 1.25) return 'low'
  if (hs <= 2.5) return 'medium'
  return 'high'
}

function assessWaterQuality(waterTemp: number, hs: number): "normal" | "watch" | "warning" {
  if (waterTemp > 30 && hs > 1.5) return 'warning'
  if (waterTemp > 28 || hs > 1.5) return 'watch'
  return 'normal'
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { buoyData, forecastData, inspectionPhotos, buoyOfflineEvents } = req.body

  if (!buoyData || buoyData.significantWaveHeight == null || buoyData.peakPeriod == null) {
    res.status(400).json({ success: false, error: '缺少必要的浮标数据（significantWaveHeight, peakPeriod）' })
    return
  }

  const hs = buoyData.significantWaveHeight
  const tp = buoyData.peakPeriod
  const mainDirection = buoyData.mainDirection ?? 0
  const windSpeed = buoyData.windSpeed ?? 0
  const waterTemp = buoyData.waterTemp ?? 20

  const batch = createBatch({
    buoyData,
    forecastData: forecastData || null,
    inspectionPhotos: inspectionPhotos || [],
    buoyOfflineEvents: buoyOfflineEvents || [],
    status: 'computed',
  })

  const rawEntry = createRawData(batch.id, {
    buoyData,
    forecastData: forecastData || null,
    inspectionPhotos: inspectionPhotos || [],
    buoyOfflineEvents: buoyOfflineEvents || [],
  })

  const jonswap = computeJONSWAP(hs, tp)
  const ratios = computeWindSwellRatio(windSpeed, hs, tp)
  const riskLevel = assessRisk(hs)
  const waterQualityAlert = assessWaterQuality(waterTemp, hs)

  const hsExplanation = hs < 1.25
    ? `有效波高${hs}m，海况平静，低于1.25m阈值，属于低风险等级。`
    : hs <= 2.5
      ? `有效波高${hs}m，海况中等，处于1.25-2.5m区间，需关注海况变化。`
      : `有效波高${hs}m，海况恶劣，超过2.5m高浪阈值，航行和作业风险显著。`

  const tpExplanation = tp < 8
    ? `谱峰周期${tp}s，对应短周期海浪，风浪成分较多，海面较混乱。`
    : tp <= 12
      ? `谱峰周期${tp}s，属于中等周期海浪，涌浪与风浪共存。`
      : `谱峰周期${tp}s，为长周期涌浪，波形规则，传播距离远。`

  const directionExplanation = `主波向${mainDirection}°，${mainDirection >= 315 || mainDirection < 45 ? '来自偏北方向' : mainDirection >= 45 && mainDirection < 135 ? '来自偏东方向' : mainDirection >= 135 && mainDirection < 225 ? '来自偏南方向' : '来自偏西方向'}，需结合风流场综合判断。`

  const parametersData = {
    hs: { value: hs, unit: 'm', explanation: hsExplanation },
    tp: { value: tp, unit: 's', explanation: tpExplanation },
    spectrumType: { value: jonswap.spectrumType, explanation: jonswap.spectrumExplanation },
    windWaveRatio: { value: Number(ratios.windWaveRatio.toFixed(3)), explanation: ratios.windExplanation },
    swellRatio: { value: Number(ratios.swellRatio.toFixed(3)), explanation: ratios.swellExplanation },
    dominantDirection: { value: mainDirection, unit: '°', explanation: directionExplanation },
  }

  const paramEntry = createParameters(batch.id, parametersData)

  const processingRecord = createProcessingRecord(batch.id, {
    algorithm: 'JONSWAP谱参数化方法',
    inputSummary: { hs, tp, mainDirection, windSpeed, waterTemp },
    riskLevel,
    waterQualityAlert,
    rawDataId: rawEntry.id,
    parametersId: paramEntry.id,
  })

  const result = {
    batchId: batch.id,
    timestamp: batch.createdAt,
    parameters: parametersData,
    riskLevel,
    waterQualityAlert,
    processingRecordId: processingRecord.id,
  }

  res.status(200).json({ success: true, data: result })
})

router.get('/:batchId', async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次不存在' })
    return
  }

  const params = getParametersByBatchId(batchId)
  const records = getProcessingRecordsByBatchId(batchId)

  if (params.length === 0 || records.length === 0) {
    res.status(404).json({ success: false, error: '该批次尚无计算结果' })
    return
  }

  const latestParam = params[params.length - 1]
  const latestRecord = records[records.length - 1]

  const result = {
    batchId,
    timestamp: batch.createdAt,
    parameters: {
      hs: latestParam.hs,
      tp: latestParam.tp,
      spectrumType: latestParam.spectrumType,
      windWaveRatio: latestParam.windWaveRatio,
      swellRatio: latestParam.swellRatio,
      dominantDirection: latestParam.dominantDirection,
    },
    riskLevel: latestRecord.riskLevel,
    waterQualityAlert: latestRecord.waterQualityAlert,
    processingRecordId: latestRecord.id,
  }

  res.status(200).json({ success: true, data: result })
})

export default router
