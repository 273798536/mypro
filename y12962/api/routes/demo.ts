import { Router, type Request, type Response } from 'express'
import { isSeeded } from '../db/schema.js'
import { seed } from '../db/seed.js'

const router = Router()

router.get('/status', (_req: Request, res: Response): void => {
  res.json({ success: true, data: { seeded: isSeeded() } })
})

router.post('/seed', (_req: Request, res: Response): void => {
  if (isSeeded()) { res.json({ success: true, data: { message: '已有示例数据，跳过注入' } }); return }
  seed()
  res.status(201).json({ success: true, data: { message: '已注入示例数据' } })
})

export default router
