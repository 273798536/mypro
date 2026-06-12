import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const stations = db.prepare(`
      SELECT
        st.*,
        COUNT(DISTINCT s.id) AS sample_count,
        COUNT(DISTINCT a.id) AS anomaly_count
      FROM station st
      LEFT JOIN sample s ON s.station_id = st.id
      LEFT JOIN anomaly a ON a.sample_id = s.id
      GROUP BY st.id
      ORDER BY st.name
    `).all() as Array<Record<string, unknown>>

    const data = stations.map((st) => ({
      id: st.id,
      name: st.name,
      region: st.region,
      latitude: st.latitude,
      longitude: st.longitude,
      sampleCount: st.sample_count,
      anomalyCount: st.anomaly_count,
      createdAt: st.created_at,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取站位列表失败' })
  }
})

export default router
