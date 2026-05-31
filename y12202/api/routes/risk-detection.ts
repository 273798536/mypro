import { Router, type Request, type Response } from 'express'
import { detectRisksForExtension } from '../services/risk-detection.js'
import { getAllRiskFlags } from '../repositories/extension.js'

const router = Router()

router.get('/extension/:extensionId', (req: Request, res: Response): void => {
  try {
    const risks = detectRisksForExtension(req.params.extensionId)
    res.json({ success: true, data: risks })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/all', (_req: Request, res: Response): void => {
  try {
    const flags = getAllRiskFlags()
    res.json({ success: true, data: flags })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
