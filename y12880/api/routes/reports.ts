import { Router, type Request, type Response } from 'express'
import { generateReport, getReportDetail, getReportList } from '../services/reportService.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  try {
    const result = getReportList()
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/generate', (req: Request, res: Response) => {
  try {
    const { batchId, platformId, format } = req.body
    const result = generateReport({
      batchId,
      platformId,
      format: format || 'pdf',
    })
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const result = getReportDetail(req.params.id)
    res.json(result)
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message })
  }
})

export default router
