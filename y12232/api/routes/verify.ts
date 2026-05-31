import { Router, type Request, type Response } from 'express'
import {
  getVerifyList,
  getVerifyStats,
  updateStatus,
  batchUpdateStatus,
  upsertIssue,
  autoVerify,
} from '../services/verify.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, issueType, page, pageSize } = req.query
    const result = await getVerifyList({
      status: status as string | undefined,
      issueType: issueType as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取核验列表失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getVerifyStats()
    res.json({ success: true, data: stats })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取统计数据失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.put('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status, operator, remark } = req.body
    if (!status) {
      res.status(400).json({ success: false, error: '缺少目标状态' })
      return
    }
    const result = await updateStatus(id, status, operator, remark)
    res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新状态失败'
    res.status(400).json({ success: false, error: message })
  }
})

router.put('/:id/issues', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const body = req.body

    if (Array.isArray(body)) {
      const results = []
      for (const item of body) {
        if (!item.type || !item.description) continue
        const result = await upsertIssue(id, item.type, item.description, item.severity, item.markedBy)
        results.push(result)
      }
      res.json({ success: true, data: results })
    } else {
      const { type, description, severity, markedBy } = body
      if (!type || !description) {
        res.status(400).json({ success: false, error: '缺少问题类型或描述' })
        return
      }
      const result = await upsertIssue(id, type, description, severity, markedBy)
      res.json({ success: true, data: result })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '添加问题标记失败'
    res.status(400).json({ success: false, error: message })
  }
})

router.post('/batch-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status, operator, remark } = req.body
    if (!ids || !Array.isArray(ids) || !status) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }
    const results = await batchUpdateStatus(ids, status, operator, remark)
    res.json({ success: true, data: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '批量更新失败'
    res.status(400).json({ success: false, error: message })
  }
})

router.post('/auto', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await autoVerify()
    res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '自动核验失败'
    res.status(500).json({ success: false, error: message })
  }
})

export default router
