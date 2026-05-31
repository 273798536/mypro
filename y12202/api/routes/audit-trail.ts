import { Router, type Request, type Response } from 'express'
import {
  getAuditTrailByExtension,
  getInfluenceChain,
  getConsistencyCheck,
  getAllAuditEntries,
  linkApprovalInfluence,
} from '../services/audit-trail.js'

const router = Router()

router.get('/extension/:extensionId', (req: Request, res: Response): void => {
  try {
    const entries = getAuditTrailByExtension(req.params.extensionId)
    res.json({ success: true, data: entries })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/influence-chain/:approvalId', (req: Request, res: Response): void => {
  try {
    const chain = getInfluenceChain(req.params.approvalId)
    if (!chain) {
      res.status(404).json({ success: false, error: '审批记录不存在' })
      return
    }
    res.json({ success: true, data: chain })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/consistency-check', (_req: Request, res: Response): void => {
  try {
    const result = getConsistencyCheck()
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/all', (_req: Request, res: Response): void => {
  try {
    const entries = getAllAuditEntries()
    res.json({ success: true, data: entries })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/link', (req: Request, res: Response): void => {
  try {
    const { approval_id, influenced_by_approval_id } = req.body
    if (!approval_id || !influenced_by_approval_id) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const influence = linkApprovalInfluence(approval_id, influenced_by_approval_id)
    res.status(201).json({ success: true, data: influence })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
