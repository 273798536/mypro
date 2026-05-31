import { Router, type Request, type Response } from 'express'
import { importData, getBatches } from '../services/import.js'
import { upload } from './upload.js'

const router = Router()

router.post(
  '/:type',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params
      if (!['farmer', 'area', 'track', 'rule'].includes(type)) {
        res.status(400).json({ success: false, error: '无效的导入类型' })
        return
      }
      if (!req.file) {
        res.status(400).json({ success: false, error: '请上传文件' })
        return
      }
      const result = await importData(
        type as 'farmer' | 'area' | 'track' | 'rule',
        req.file.path,
        req.file.originalname,
        req.body.operator || 'admin'
      )
      res.json({ success: true, data: result })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '导入失败'
      res.status(500).json({ success: false, error: message })
    }
  }
)

router.get('/batches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query
    const batches = await getBatches(type as string | undefined)
    res.json({ success: true, data: batches })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取批次列表失败'
    res.status(500).json({ success: false, error: message })
  }
})

export default router
