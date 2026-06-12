import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const pendingCount = (db.prepare("SELECT COUNT(*) AS count FROM sample WHERE status = 'pending'").get() as Record<string, number>).count

    const anomalyByType = db.prepare(`
      SELECT type, COUNT(*) AS count
      FROM anomaly
      GROUP BY type
    `).all() as Array<{ type: string; count: number }>

    const anomalyCountByType: Record<string, number> = { supplement: 0, recalibrate: 0 }
    for (const row of anomalyByType) {
      anomalyCountByType[row.type] = row.count
    }

    const buoyLateCount = (db.prepare("SELECT COUNT(*) AS count FROM buoy_data WHERE is_late = 1").get() as Record<string, number>).count

    const recentAuditLogs = db.prepare(`
      SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10
    `).all() as Array<Record<string, unknown>>

    const weatherForecastSummary = db.prepare(`
      SELECT st.name AS stationName, wf.wind_speed AS windSpeed, wf.wave_height AS waveHeight, wf.forecast_date AS forecastTime
      FROM weather_forecast wf
      JOIN sample s ON wf.sample_id = s.id
      JOIN station st ON s.station_id = st.id
      ORDER BY wf.forecast_date DESC
      LIMIT 5
    `).all() as Array<{ stationName: string; windSpeed: number; waveHeight: number; forecastTime: string }>

    res.json({
      success: true,
      data: {
        pendingCount,
        anomalyCountByType,
        buoyLateCount,
        recentAuditLogs: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          detail: log.details,
          timestamp: log.created_at,
        })),
        weatherForecastSummary,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取仪表盘数据失败' })
  }
})

export default router
