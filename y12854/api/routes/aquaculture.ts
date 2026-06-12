import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { recalculateTide } from './tide.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { stationId } = req.query

    let sql = `
      SELECT al.*, st.name AS station_name
      FROM aquaculture_log al
      JOIN station st ON al.station_id = st.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (stationId) {
      sql += ' AND al.station_id = ?'
      params.push(stationId)
    }

    sql += ' ORDER BY al.report_date DESC'

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

    const data = rows.map((l) => ({
      id: l.id,
      stationId: l.station_id,
      stationName: l.station_name,
      sampleId: l.sample_id,
      species: l.species,
      activity: l.activity,
      mortality: l.mortality,
      observation: l.observation,
      reportedBy: l.reported_by,
      reportDate: l.report_date,
      createdAt: l.created_at,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取养殖日志失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { stationId, sampleId, species, activity, mortality, observation, reportedBy, reportDate } = req.body as {
      stationId: string
      sampleId?: string
      species: string
      activity: string
      mortality?: number
      observation?: string
      reportedBy: string
      reportDate: string
    }

    if (!stationId || !species || !activity || !reportedBy || !reportDate) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const station = db.prepare('SELECT * FROM station WHERE id = ?').get(stationId)
    if (!station) {
      res.status(404).json({ success: false, error: '站位不存在' })
      return
    }

    const now = new Date().toISOString()
    const logId = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO aquaculture_log (id, station_id, sample_id, species, activity, mortality, observation, reported_by, report_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId, stationId, sampleId ?? null, species, activity,
        mortality ?? null, observation ?? null, reportedBy, reportDate, now
      )

      db.prepare(`
        INSERT INTO audit_log (id, action, target_type, target_id, details, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), 'aquaculture_log_created', 'aquaculture_log', logId,
        `新增养殖日志，站位ID: ${stationId}，物种: ${species}，活动: ${activity}`,
        reportedBy, now
      )

      const tideResult = recalculateTide(stationId, reportedBy)

      return tideResult
    })

    const tideResult = transaction()

    res.status(201).json({
      success: true,
      data: {
        id: logId,
        stationId,
        sampleId: sampleId ?? null,
        species,
        activity,
        mortality: mortality ?? null,
        observation: observation ?? null,
        reportedBy,
        reportDate,
        createdAt: now,
        tideRecalculation: tideResult,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建养殖日志失败' })
  }
})

export default router
