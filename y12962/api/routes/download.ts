import { Router, type Request, type Response } from 'express'
import { buildReport } from '../services/download.js'

const router = Router()

router.get('/:runId', (req: Request, res: Response): void => {
  const result = buildReport(req.params.runId)
  if (!result) { res.status(404).json({ success: false, error: '运行不存在' }); return }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.send(result.content)
})

export default router
