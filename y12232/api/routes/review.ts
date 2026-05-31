import { Router, type Request, type Response } from 'express'
import { getReviewList, submitReview } from '../services/review.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page, pageSize } = req.query
    const result = await getReviewList({
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取复核列表失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { conclusion, reviewer, opinion } = req.body
    if (!conclusion || !['passed', 'rejected'].includes(conclusion)) {
      res.status(400).json({ success: false, error: '复核结论必须为 passed 或 rejected' })
      return
    }
    const result = await submitReview(id, conclusion, reviewer, opinion)
    res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '提交复核失败'
    res.status(400).json({ success: false, error: message })
  }
})

export default router
