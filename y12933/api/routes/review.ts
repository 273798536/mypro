import { Router, type Request, type Response } from 'express'
import * as service from '../services/reviewService.js'
import type { Conclusion, ReviewFilters } from '../../shared/types.js'

const router = Router()

function parseFilters(req: Request): ReviewFilters {
  const q = req.query as Record<string, string | undefined>
  const filters: ReviewFilters = {}
  if (q.version) filters.version = q.version
  if (q.model_version) filters.model_version = q.model_version
  if (q.conclusion) filters.conclusion = q.conclusion as Conclusion | 'pending'
  if (q.bias_type) filters.bias_type = q.bias_type
  if (q.q) filters.q = q.q
  return filters
}

router.post('/import', (req: Request, res: Response) => {
  try {
    const { csv, label } = req.body as { csv?: string; label?: string }
    if (!csv || typeof csv !== 'string') {
      res.status(400).json({ success: false, error: '缺少 csv 文本' })
      return
    }
    const result = service.importCsv(csv, label)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message })
  }
})

router.get('/records', (req: Request, res: Response) => {
  const rows = service.listReviewRows(parseFilters(req))
  res.json({ success: true, data: rows })
})

router.get('/records/:id', (req: Request, res: Response) => {
  const row = service.getRecord(req.params.id)
  if (!row) {
    res.status(404).json({ success: false, error: '记录不存在' })
    return
  }
  res.json({ success: true, data: row })
})

router.patch('/records/:id/conclusion', (req: Request, res: Response) => {
  try {
    const payload = req.body as service.ConclusionPayload
    if (!payload || !payload.conclusion) {
      res.status(400).json({ success: false, error: '缺少 conclusion' })
      return
    }
    service.upsertConclusion(req.params.id, payload)
    const row = service.getRecord(req.params.id)
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message })
  }
})

router.delete('/records/:id/conclusion', (req: Request, res: Response) => {
  service.deleteConclusion(req.params.id)
  const row = service.getRecord(req.params.id)
  res.json({ success: true, data: row })
})

router.get('/summary', (req: Request, res: Response) => {
  const summary = service.getSummary(parseFilters(req))
  res.json({ success: true, data: summary })
})

router.get('/export', (req: Request, res: Response) => {
  const csv = service.exportCsv(parseFilters(req))
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="bias-review-${stamp}.csv"`)
  res.send('\ufeff' + csv)
})

router.get('/versions', (_req: Request, res: Response) => {
  const versions = service.listVersions()
  res.json({ success: true, data: versions })
})

router.get('/versions/compare', (req: Request, res: Response) => {
  const a = (req.query.a as string) || ''
  const b = (req.query.b as string) || ''
  if (!a || !b) {
    res.status(400).json({ success: false, error: '需要 a 与 b 两个版本' })
    return
  }
  const rows = service.compareVersions(a, b)
  res.json({ success: true, data: rows })
})

router.get('/meta', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      model_versions: service.listModelVersions(),
      bias_types: service.listBiasTypes(),
      conclusions: ['通过', '待确认', '驳回'],
    },
  })
})

export default router
