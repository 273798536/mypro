import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/status', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare(`
      SELECT bd.*, s.station_id, st.name AS station_name
      FROM buoy_data bd
      JOIN sample s ON bd.sample_id = s.id
      JOIN station st ON s.station_id = st.id
      ORDER BY bd.is_late DESC, bd.created_at DESC
    `).all() as Record<string, unknown>[]

    const data = rows.map((b) => ({
      id: b.id,
      sampleId: b.sample_id,
      stationId: b.station_id,
      stationName: b.station_name,
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
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取浮标状态失败' })
  }
})

router.post('/arrive', (req: Request, res: Response): void => {
  try {
    const { sampleId } = req.body as { sampleId: string }

    if (!sampleId) {
      res.status(400).json({ success: false, error: '请提供sampleId' })
      return
    }

    const buoy = db.prepare('SELECT * FROM buoy_data WHERE sample_id = ? AND is_late = 1').get(sampleId) as Record<string, unknown> | undefined

    if (!buoy) {
      res.status(404).json({ success: false, error: '未找到该样本的延迟浮标数据' })
      return
    }

    const now = new Date().toISOString()

    const affectedConclusions = buoy.affected_conclusions
      ? JSON.parse(buoy.affected_conclusions as string)
      : []

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE buoy_data SET is_late = 0, arrived_at = ?, reported_at = ?
        WHERE id = ?
      `).run(now, now, buoy.id)

      db.prepare(`
        UPDATE sample SET conclusion = '待更新', updated_at = ?
        WHERE id = ?
      `).run(now, sampleId)

      db.prepare(`
        INSERT INTO audit_log (id, action, target_type, target_id, details, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), 'buoy_arrived', 'buoy_data', buoy.id as string,
        `延迟浮标数据已到达，样本结论标记为"待更新"，受影响结论: ${JSON.stringify(affectedConclusions)}`,
        '系统', now
      )
    })

    transaction()

    res.json({
      success: true,
      data: {
        sampleId,
        arrivedAt: now,
        affectedConclusions,
        message: '浮标数据已到达，旧结论标记为"待更新"，请重新评估样本数据',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '处理浮标到达失败' })
  }
})

export default router
