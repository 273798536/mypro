import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/:stationId', (req: Request, res: Response): void => {
  try {
    const { stationId } = req.params

    const rows = db.prepare(`
      SELECT td.*, st.name AS station_name
      FROM tide_data td
      JOIN station st ON td.station_id = st.id
      WHERE td.station_id = ?
      ORDER BY td.created_at DESC
    `).all(stationId) as Record<string, unknown>[]

    const data = rows.map((t) => ({
      id: t.id,
      sampleId: t.sample_id,
      stationId: t.station_id,
      stationName: t.station_name,
      tideType: t.tide_type,
      highTideTime: t.high_tide_time,
      lowTideTime: t.low_tide_time,
      highTideHeight: t.high_tide_height,
      lowTideHeight: t.low_tide_height,
      timezone: t.timezone,
      timezoneValid: Boolean(t.timezone_valid),
      timezoneError: t.timezone_error,
      createdAt: t.created_at,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取潮汐数据失败' })
  }
})

function recalculateTide(stationId: string, performedBy: string) {
  const now = new Date().toISOString()

  const invalidTides = db.prepare(`
    SELECT td.*, s.id AS sample_id
    FROM tide_data td
    JOIN sample s ON td.sample_id = s.id
    WHERE td.station_id = ? AND td.timezone_valid = 0
  `).all(stationId) as Array<Record<string, unknown>>

  if (invalidTides.length === 0) {
    return { fixed: 0, message: '该站位无时区错误的潮汐数据' }
  }

  const transaction = db.transaction(() => {
    for (const tide of invalidTides) {
      const highTideTime = tide.high_tide_time as string
      const lowTideTime = tide.low_tide_time as string

      const fixedHighTide = highTideTime.replace('+00:00', '+08:00').replace('Z', '+08:00')
      const fixedLowTide = lowTideTime.replace('+00:00', '+08:00').replace('Z', '+08:00')

      db.prepare(`
        UPDATE tide_data
        SET timezone = 'Asia/Shanghai', timezone_valid = 1, timezone_error = NULL,
            high_tide_time = ?, low_tide_time = ?
        WHERE id = ?
      `).run(fixedHighTide, fixedLowTide, tide.id)

      db.prepare(`
        UPDATE sample SET updated_at = ? WHERE id = ?
      `).run(now, tide.sample_id)

      db.prepare(`
        INSERT INTO audit_log (id, action, target_type, target_id, details, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), 'tide_recalculated', 'tide_data', tide.id as string,
        `潮汐数据时区修正：UTC -> Asia/Shanghai，高潮时间 ${highTideTime} -> ${fixedHighTide}，低潮时间 ${lowTideTime} -> ${fixedLowTide}`,
        performedBy, now
      )
    }
  })

  transaction()

  return {
    fixed: invalidTides.length,
    message: `已修正 ${invalidTides.length} 条潮汐数据的时区错误，UTC已更正为Asia/Shanghai`,
  }
}

router.post('/recalculate', (req: Request, res: Response): void => {
  try {
    const { stationId } = req.body as { stationId: string }

    if (!stationId) {
      res.status(400).json({ success: false, error: '请提供stationId' })
      return
    }

    const station = db.prepare('SELECT * FROM station WHERE id = ?').get(stationId)
    if (!station) {
      res.status(404).json({ success: false, error: '站位不存在' })
      return
    }

    const result = recalculateTide(stationId, '操作员')
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '重新计算潮汐失败' })
  }
})

export { recalculateTide }
export default router
