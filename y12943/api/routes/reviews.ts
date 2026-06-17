import { Router, type Request, type Response } from 'express'
import { getAllReviews, getReviewById, resolveReview } from '../store.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  res.json({ success: true, data: getAllReviews() })
})

router.post('/:id/resolve', (req: Request, res: Response): void => {
  const { conclusion } = req.body as { conclusion?: string }
  if (!conclusion || !conclusion.trim()) {
    res.status(400).json({ success: false, error: '结论不能为空' })
    return
  }
  const review = resolveReview(req.params.id, conclusion.trim())
  if (!review) {
    res.status(404).json({ success: false, error: '复核轮次不存在' })
    return
  }
  res.json({ success: true, data: review })
})

router.get('/:id', (req: Request, res: Response): void => {
  const review = getReviewById(req.params.id)
  if (!review) {
    res.status(404).json({ success: false, error: '复核轮次不存在' })
    return
  }
  res.json({ success: true, data: review })
})

export default router
