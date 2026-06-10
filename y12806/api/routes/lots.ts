import { Router } from 'express'
import {
  getLots,
  getLotStats,
  getSamplesByLotId,
  getSites,
  getTimelineByLotId,
  compareLots,
} from '../services/dataService.js'
import type { ReagentLot, LotStats, Sample, SamplingSite, TimelineNode, DiffReport } from '../../shared/types/index.js'

const router = Router()

type LotDetail = ReagentLot & LotStats & { samples: Sample[]; samplingSites: SamplingSite[] }

router.get('/', async (req, res) => {
  try {
    const [lots, stats] = await Promise.all([getLots(), getLotStats()])
    const statsMap = new Map(stats.map((s) => [s.lot_id, s]))
    const result = lots.map((lot) => ({
      ...lot,
      sample_count: statsMap.get(lot.id)?.sample_count ?? 0,
      band_count: statsMap.get(lot.id)?.band_count ?? 0,
      avg_quality: statsMap.get(lot.id)?.avg_quality ?? 0,
      pending_count: statsMap.get(lot.id)?.pending_count ?? 0,
      anomaly_count: statsMap.get(lot.id)?.anomaly_count ?? 0,
    }))
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [lots, stats, samples, sites] = await Promise.all([
      getLots(),
      getLotStats(),
      getSamplesByLotId(id),
      getSites(),
    ])
    const lot = lots.find((l) => l.id === id)
    if (!lot) {
      res.status(404).json({ success: false, error: 'Lot not found' })
      return
    }
    const lotStat = stats.find((s) => s.lot_id === id)
    const siteIds = new Set(samples.map((s) => s.sampling_site_id).filter(Boolean))
    const samplingSites = sites.filter((s) => siteIds.has(s.id))
    const detail: LotDetail = {
      ...lot,
      lot_id: lot.id,
      lot_number: lot.lot_number,
      sample_count: lotStat?.sample_count ?? 0,
      band_count: lotStat?.band_count ?? 0,
      avg_quality: lotStat?.avg_quality ?? 0,
      pending_count: lotStat?.pending_count ?? 0,
      anomaly_count: lotStat?.anomaly_count ?? 0,
      samples,
      samplingSites,
    }
    res.json({ success: true, data: detail })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params
    const timeline: TimelineNode[] = await getTimelineByLotId(id)
    res.json({ success: true, data: timeline })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/compare/:oldId/:newId', async (req, res) => {
  try {
    const { oldId, newId } = req.params
    const report: DiffReport = await compareLots(oldId, newId)
    res.json({ success: true, data: report })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
