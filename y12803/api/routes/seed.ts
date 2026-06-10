import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import { insertSeedData, checkSeedStatus } from '../seed.js'

const router = Router()

router.post('/', (_req: Request, res: Response): void => {
  const db = getDb()

  if (checkSeedStatus(db)) {
    res.status(409).json({ success: false, error: '种子数据已存在' })
    return
  }

  try {
    insertSeedData(db)
    res.json({ success: true, message: '种子数据初始化成功' })
  } catch (err) {
    res.status(500).json({ success: false, error: '种子数据初始化失败', detail: String(err) })
  }
})

router.get('/status', (_req: Request, res: Response): void => {
  const db = getDb()
  const seeded = checkSeedStatus(db)
  res.json({ success: true, data: { seeded } })
})

export default router
