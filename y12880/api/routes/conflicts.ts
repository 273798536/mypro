import { Router, type Request, type Response } from 'express'
import { getConflicts, resolveConflict } from '../services/conflictService.js'
import type { Severity, ConflictStatus, ResolutionType } from '../services/conflictService.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const severity = req.query.severity as Severity | undefined
    const status = req.query.status as ConflictStatus | undefined
    const batchId = req.query.batchId as string | undefined

    const result = getConflicts({ page, pageSize, severity, status, batchId })
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { resolution, remark } = req.body

    if (!resolution || !['supplement', 'adjust', 'accept'].includes(resolution)) {
      res.status(400).json({ success: false, error: '无效的解决方式' })
      return
    }

    const result = resolveConflict(id, resolution as ResolutionType, remark || '')
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
