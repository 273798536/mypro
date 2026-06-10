import { Router } from 'express'
import { getBands, getSamples, getRuns, supplementBand } from '../services/dataService.js'
import type { Band } from '../../shared/types/index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { lotId, runIndex, labelCategory, confirmStatus, qualityMin } = req.query
    const [bands, samples, runs] = await Promise.all([getBands(), getSamples(), getRuns()])
    let result: Band[] = bands

    if (lotId) {
      const lotSamples = samples.filter((s) => s.lot_id === String(lotId))
      const sampleIds = new Set(lotSamples.map((s) => s.id))
      result = result.filter((b) => sampleIds.has(b.sample_id))
    }

    if (runIndex !== undefined && runIndex !== '') {
      const idx = Number(runIndex)
      if (!Number.isNaN(idx)) {
        const targetRuns = runs.filter((r) => r.run_index === idx)
        if (lotId) {
          const filtered = targetRuns.filter((r) => {
            const s = samples.find((x) => x.id && r.lot_id === x.lot_id)
            return lotId ? r.lot_id === String(lotId) || (s?.lot_id === String(lotId)) : true
          })
          const runIds = new Set(filtered.map((r) => r.id))
          result = result.filter((b) => runIds.has(b.run_id))
        } else {
          const runIds = new Set(targetRuns.map((r) => r.id))
          result = result.filter((b) => runIds.has(b.run_id))
        }
      }
    }

    if (lotId && runIndex !== undefined && runIndex !== '') {
      const lotRuns = runs.filter((r) => r.lot_id === String(lotId) && r.run_index === Number(runIndex))
      const runIds = new Set(lotRuns.map((r) => r.id))
      result = result.filter((b) => runIds.has(b.run_id))
    } else if (runIndex !== undefined && runIndex !== '') {
      const allRuns = runs.filter((r) => r.run_index === Number(runIndex))
      if (lotId) {
        const filtered = allRuns.filter((r) => r.lot_id === String(lotId))
        if (filtered.length) {
          const runIds = new Set(filtered.map((r) => r.id))
          result = result.filter((b) => runIds.has(b.run_id))
        }
      }
    }

    if (lotId) {
      const samplesMap = new Map(samples.map((s) => [s.id, s.lot_id]))
      result = bands.filter((b) => samplesMap.get(b.sample_id) === String(lotId))
      if (runIndex !== undefined && runIndex !== '') {
        const lotRuns = runs.filter((r) => r.lot_id === String(lotId) && r.run_index === Number(runIndex))
        const runIds = new Set(lotRuns.map((r) => r.id))
        result = result.filter((b) => runIds.has(b.run_id))
      }
    } else if (runIndex !== undefined && runIndex !== '') {
      const rIdx = Number(runIndex)
      if (!Number.isNaN(rIdx)) {
        const runIds = new Set(runs.filter((r) => r.run_index === rIdx).map((r) => r.id))
        result = result.filter((b) => runIds.has(b.run_id))
      }
    }

    if (labelCategory) {
      result = result.filter((b) => b.label_category === String(labelCategory))
    }

    if (confirmStatus) {
      result = result.filter((b) => b.confirm_status === String(confirmStatus))
    }

    if (qualityMin !== undefined && qualityMin !== '') {
      const q = Number(qualityMin)
      if (!Number.isNaN(q)) {
        result = result.filter((b) => b.quality_score >= q)
      }
    }

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const fields = req.body ?? {}
    const band: Band = await supplementBand(id, fields)
    res.json({ success: true, data: band })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
