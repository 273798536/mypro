import { Router, type Request, type Response } from 'express'
import {
  calculateAllocation,
  getAllocationResults,
  getAllocationSummary,
} from '../services/allocationService.js'

const router = Router()

router.post('/calculate', (_req: Request, res: Response) => {
  try {
    const result = calculateAllocation()
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/results', (req: Request, res: Response) => {
  try {
    const version = req.query.version as string | undefined
    const scenicSpotId = req.query.scenicSpotId as string | undefined
    const cardNo = req.query.cardNo as string | undefined

    const results = getAllocationResults(version, scenicSpotId, cardNo)
    res.json({ results, total: results.length })
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/summary', (req: Request, res: Response) => {
  try {
    const version = req.query.version as string | undefined
    const summary = getAllocationSummary(version)
    res.json(summary)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
