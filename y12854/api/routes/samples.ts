import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

function buildSampleRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    sampleDate: row.sample_date,
    status: row.status,
    collector: row.collector,
    ph: row.ph,
    dissolvedOxygen: row.dissolved_oxygen,
    chlorophyllA: row.chlorophyll_a,
    salinity: row.salinity,
    temperature: row.temperature,
    turbidity: row.turbidity,
    notes: row.notes,
    conclusion: row.conclusion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function enrichSample(sampleRow: Record<string, unknown>) {
  const sampleId = sampleRow.id as string

  const weather = db.prepare('SELECT * FROM weather_forecast WHERE sample_id = ?').all(sampleId)
  const buoys = db.prepare('SELECT * FROM buoy_data WHERE sample_id = ?').all(sampleId)
  const tides = db.prepare('SELECT * FROM tide_data WHERE sample_id = ?').all(sampleId)
  const anomalies = db.prepare('SELECT * FROM anomaly WHERE sample_id = ?').all(sampleId)
  const logs = db.prepare('SELECT * FROM aquaculture_log WHERE sample_id = ?').all(sampleId)

  return {
    ...buildSampleRow(sampleRow),
    weatherForecast: weather.map((w: Record<string, unknown>) => ({
      id: w.id,
      sampleId: w.sample_id,
      windSpeed: w.wind_speed,
      windDirection: w.wind_direction,
      waveHeight: w.wave_height,
      airTemperature: w.air_temperature,
      humidity: w.humidity,
      weatherCondition: w.weather_condition,
      forecastDate: w.forecast_date,
      createdAt: w.created_at,
    })),
    buoyData: buoys.map((b: Record<string, unknown>) => ({
      id: b.id,
      sampleId: b.sample_id,
      isLate: Boolean(b.is_late),
      arrivedAt: b.arrived_at,
      affectedConclusions: b.affected_conclusions ? JSON.parse(b.affected_conclusions as string) : null,
      waterTemperature: b.water_temperature,
      salinity: b.salinity,
      dissolvedOxygen: b.dissolved_oxygen,
      ph: b.ph,
      chlorophyllA: b.chlorophyll_a,
      turbidity: b.turbidity,
      reportedAt: b.reported_at,
      createdAt: b.created_at,
    })),
    tideData: tides.map((t: Record<string, unknown>) => ({
      id: t.id,
      sampleId: t.sample_id,
      stationId: t.station_id,
      tideType: t.tide_type,
      highTideTime: t.high_tide_time,
      lowTideTime: t.low_tide_time,
      highTideHeight: t.high_tide_height,
      lowTideHeight: t.low_tide_height,
      timezone: t.timezone,
      timezoneValid: Boolean(t.timezone_valid),
      timezoneError: t.timezone_error,
      createdAt: t.created_at,
    })),
    anomalies: anomalies.map((a: Record<string, unknown>) => ({
      id: a.id,
      sampleId: a.sample_id,
      type: a.type,
      status: a.status,
      description: a.description,
      resolution: a.resolution,
      createdAt: a.created_at,
      resolvedAt: a.resolved_at,
    })),
    aquacultureLog: logs.map((l: Record<string, unknown>) => ({
      id: l.id,
      stationId: l.station_id,
      sampleId: l.sample_id,
      species: l.species,
      activity: l.activity,
      mortality: l.mortality,
      observation: l.observation,
      reportedBy: l.reported_by,
      reportDate: l.report_date,
      createdAt: l.created_at,
    })),
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { stationId, status, hasAnomaly } = req.query

    let sql = `
      SELECT s.*, st.name AS station_name
      FROM sample s
      JOIN station st ON s.station_id = st.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (stationId) {
      sql += ' AND s.station_id = ?'
      params.push(stationId)
    }
    if (status) {
      sql += ' AND s.status = ?'
      params.push(status)
    }
    if (hasAnomaly === 'true') {
      sql += ' AND EXISTS (SELECT 1 FROM anomaly a WHERE a.sample_id = s.id)'
    } else if (hasAnomaly === 'false') {
      sql += ' AND NOT EXISTS (SELECT 1 FROM anomaly a WHERE a.sample_id = s.id)'
    }

    sql += ' ORDER BY s.sample_date DESC'

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    const samples = rows.map(buildSampleRow)

    res.json({ success: true, data: samples })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取样本列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const row = db.prepare(`
      SELECT s.*, st.name AS station_name
      FROM sample s
      JOIN station st ON s.station_id = st.id
      WHERE s.id = ?
    `).get(req.params.id) as Record<string, unknown> | undefined

    if (!row) {
      res.status(404).json({ success: false, error: '样本不存在' })
      return
    }

    res.json({ success: true, data: enrichSample(row) })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取样本详情失败' })
  }
})

router.post('/import', (req: Request, res: Response): void => {
  try {
    const { samples } = req.body as {
      samples: Array<{
        stationId: string
        sampleDate: string
        collector: string
        ph?: number
        dissolvedOxygen?: number
        chlorophyllA?: number
        salinity?: number
        temperature?: number
        turbidity?: number
        notes?: string
        conclusion?: string
      }>
    }

    if (!Array.isArray(samples) || samples.length === 0) {
      res.status(400).json({ success: false, error: '请提供有效的样本数组' })
      return
    }

    const now = new Date().toISOString()
    const insertSample = db.prepare(`
      INSERT INTO sample (id, station_id, sample_date, status, collector, ph, dissolved_oxygen, chlorophyll_a, salinity, temperature, turbidity, notes, conclusion, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertAudit = db.prepare(`
      INSERT INTO audit_log (id, action, target_type, target_id, details, performed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction(() => {
      const imported: Array<{ id: string; stationId: string; sampleDate: string }> = []
      for (const s of samples) {
        const id = uuidv4()
        insertSample.run(
          id, s.stationId, s.sampleDate, s.collector,
          s.ph ?? null, s.dissolvedOxygen ?? null, s.chlorophyllA ?? null,
          s.salinity ?? null, s.temperature ?? null, s.turbidity ?? null,
          s.notes ?? null, s.conclusion ?? null, now, now
        )
        insertAudit.run(
          uuidv4(), 'sample_import', 'sample', id,
          `批量导入样本，站位ID: ${s.stationId}`, '系统', now
        )
        imported.push({ id, stationId: s.stationId, sampleDate: s.sampleDate })
      }
      return imported
    })

    const imported = transaction()
    res.status(201).json({ success: true, data: imported, count: imported.length })
  } catch (error) {
    res.status(500).json({ success: false, error: '批量导入样本失败' })
  }
})

export default router
