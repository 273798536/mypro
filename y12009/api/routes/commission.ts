import { Router, type Request, type Response } from 'express'
import { listRules, calculateCommission } from '../services/commission.js'

const router = Router()

router.get('/commission-rules', (req: Request, res: Response): void => {
  try {
    const data = listRules()
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/commission-rules/calculate', (req: Request, res: Response): void => {
  try {
    const { salePrice } = req.body
    const data = calculateCommission(Number(salePrice))
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
