import { Router, type Request, type Response } from 'express'
import { getDatabaseStatus } from '../services/databaseService.js'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  try {
    const result = getDatabaseStatus()
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
