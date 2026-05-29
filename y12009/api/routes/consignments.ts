import { Router, type Request, type Response } from 'express'
import { listConsignments, getConsignmentDetail } from '../services/consignment.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const data = listConsignments()
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const data = getConsignmentDetail(req.params.id)
    if (!data) {
      res.status(404).json({ success: false, error: 'Consignment not found' })
      return
    }
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
