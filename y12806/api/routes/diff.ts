import { Router } from 'express'
import { triggerDiffRun, getGroupStats } from '../services/dataService.js'
import type { DiffReport, GroupStats } from '../../shared/types/index.js'

const router = Router()

router.post('/run', async (req, res) => {
  try {
    const body = req.body ?? {}
    const lotId = body.lotId ?? body.lot_id
    const params = body.params
    if (!lotId) {
      res.status(400).json({ success: false, error: 'lotId is required' })
      return
    }
    const report: DiffReport = await triggerDiffRun(String(lotId), params ?? {})
    res.json({ success: true, data: report })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/group-stats/:lotId', async (req, res) => {
  try {
    const { lotId } = req.params
    const stats: GroupStats[] = await getGroupStats(lotId)
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
