import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function buildInterceptionExplanation(anomaly: Record<string, unknown>, sample: Record<string, unknown>, station: Record<string, unknown>): string {
  const anomalyType = anomaly.type as string
  const stationName = station.name as string

  if (anomalyType === 'supplement') {
    if ((anomaly.description as string).includes('浮标')) {
      return `浮标数据延迟拦截：站位"${stationName}"的样本(采样时间: ${sample.sample_date})浮标数据延迟到达，溶解氧相关结论暂无法确认。在浮标数据补全前，该样本的溶解氧判定结果不可靠，因此被自动拦截。修正方法：等待浮标数据到达后，系统自动标记旧结论为"待更新"，需操作员基于完整数据重新评估溶解氧指标。`
    }
    if ((anomaly.description as string).includes('叶绿素')) {
      return `叶绿素a浓度异常拦截：站位"${stationName}"的样本(采样时间: ${sample.sample_date})叶绿素a浓度达${sample.chlorophyll_a}μg/L，远超东海海域正常阈值(通常<5μg/L)，提示可能存在赤潮前期风险。该指标异常偏高，单次采样不足以确认趋势，因此被自动拦截并要求补测。修正方法：在该站位进行补充采样，确认叶绿素a浓度是否持续升高或回落。`
    }
    return `补测拦截：站位"${stationName}"的样本(采样时间: ${sample.sample_date})存在数据异常需要补测。${anomaly.description}`
  }

  if (anomalyType === 'recalibrate') {
    if ((anomaly.description as string).includes('时区')) {
      return `潮位时区错误拦截：该站位潮汐数据时区记录为UTC，但实际采样站位位于东八区(Asia/Shanghai)，时差8小时会导致潮位计算偏移，因此该样本的潮汐关联分析被自动拦截。修正方法：将时区更正为Asia/Shanghai后重新计算潮汐。`
    }
    if ((anomaly.description as string).includes('盐度')) {
      return `盐度传感器校准拦截：站位"${stationName}"的样本(采样时间: ${sample.sample_date})盐度读数为${sample.salinity}‰，显著低于该海域正常范围(31-33‰)。浮标同步盐度数据也异常偏低，在无大量淡水输入的情况下，该读数不合理，怀疑电导率传感器需重新校准，因此被自动拦截。修正方法：重新校准电导率传感器后重新采样测量。`
    }
    return `重新校准拦截：站位"${stationName}"的样本(采样时间: ${sample.sample_date})存在仪器校准问题。${anomaly.description}`
  }

  return `数据拦截：站位"${stationName}"的样本存在异常。${anomaly.description}`
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const stations = db.prepare('SELECT * FROM station').all() as Array<Record<string, unknown>>
    const stationMap = new Map<string, Record<string, unknown>>()
    for (const st of stations) {
      stationMap.set(st.id as string, st)
    }

    const samples = db.prepare(`
      SELECT s.*, st.name AS station_name
      FROM sample s
      JOIN station st ON s.station_id = st.id
      ORDER BY s.sample_date DESC
    `).all() as Array<Record<string, unknown>>

    const anomalies = db.prepare('SELECT * FROM anomaly ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
    const anomalyMap = new Map<string, Record<string, unknown>>()
    for (const a of anomalies) {
      anomalyMap.set(a.sample_id as string, a)
    }

    const buoyData = db.prepare('SELECT * FROM buoy_data').all() as Array<Record<string, unknown>>
    const buoyMap = new Map<string, Record<string, unknown>>()
    for (const b of buoyData) {
      buoyMap.set(b.sample_id as string, b)
    }

    const tideData = db.prepare('SELECT * FROM tide_data').all() as Array<Record<string, unknown>>
    const tideMap = new Map<string, Record<string, unknown>>()
    for (const t of tideData) {
      tideMap.set(t.sample_id as string, t)
    }

    const sampleReports = samples.map((s) => {
      const station = stationMap.get(s.station_id as string) || {}
      const anomaly = anomalyMap.get(s.id as string)
      const buoy = buoyMap.get(s.id as string)
      const tide = tideMap.get(s.id as string)

      const reportItem: Record<string, unknown> = {
        id: s.id,
        stationId: s.station_id,
        stationName: s.station_name,
        stationRegion: station.region,
        stationLatitude: station.latitude,
        stationLongitude: station.longitude,
        sampleDate: s.sample_date,
        status: s.status,
        collector: s.collector,
        ph: s.ph,
        dissolvedOxygen: s.dissolved_oxygen,
        chlorophyllA: s.chlorophyll_a,
        salinity: s.salinity,
        temperature: s.temperature,
        turbidity: s.turbidity,
        notes: s.notes,
        conclusion: s.conclusion,
      }

      if (buoy) {
        reportItem.buoyData = {
          isLate: Boolean(buoy.is_late),
          arrivedAt: buoy.arrived_at,
          affectedConclusions: buoy.affected_conclusions ? JSON.parse(buoy.affected_conclusions as string) : null,
          waterTemperature: buoy.water_temperature,
          salinity: buoy.salinity,
          dissolvedOxygen: buoy.dissolved_oxygen,
        }
      }

      if (tide) {
        reportItem.tideData = {
          tideType: tide.tide_type,
          highTideTime: tide.high_tide_time,
          lowTideTime: tide.low_tide_time,
          highTideHeight: tide.high_tide_height,
          lowTideHeight: tide.low_tide_height,
          timezone: tide.timezone,
          timezoneValid: Boolean(tide.timezone_valid),
          timezoneError: tide.timezone_error,
        }
      }

      if (anomaly) {
        reportItem.anomaly = {
          type: anomaly.type,
          status: anomaly.status,
          description: anomaly.description,
          resolution: anomaly.resolution,
          interceptionExplanation: buildInterceptionExplanation(anomaly, s, station),
        }
      }

      return reportItem
    })

    const anomalyStats = {
      total: anomalies.length,
      pending: anomalies.filter((a) => a.status === 'pending').length,
      resolved: anomalies.filter((a) => a.status === 'resolved').length,
      byType: anomalies.reduce<Record<string, number>>((acc, a) => {
        acc[a.type as string] = (acc[a.type as string] || 0) + 1
        return acc
      }, {}),
    }

    const sampleStats = {
      total: samples.length,
      pending: samples.filter((s) => s.status === 'pending').length,
      reviewed: samples.filter((s) => s.status === 'reviewed').length,
      rejected: samples.filter((s) => s.status === 'rejected').length,
    }

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        stationCount: stations.length,
        sampleStats,
        anomalyStats,
        samples: sampleReports,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '生成报告失败' })
  }
})

export default router
