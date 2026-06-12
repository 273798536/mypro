import { Router, type Request, type Response } from 'express'
import { getRisks, getRiskOverview } from '../services/riskService.js'
import type { RiskLevel } from '../services/riskService.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const level = req.query.level as RiskLevel | undefined
    const platformId = req.query.platformId as string | undefined
    const batchId = req.query.batchId as string | undefined

    const result = getRisks({ page, pageSize, level, platformId, batchId })
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/overview', (req: Request, res: Response) => {
  try {
    const batchId = req.query.batchId as string | undefined
    const result = getRiskOverview(batchId)
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
