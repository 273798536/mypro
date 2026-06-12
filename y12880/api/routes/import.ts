import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { importTideData, importBuoyData, importEquipment, runInspection, getBatches } from '../services/importService.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/tide', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传文件' })
      return
    }
    const result = importTideData(
      req.file,
      req.body.source || 'tide_table.csv',
      req.body.remark
    )
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.post('/buoy', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传文件' })
      return
    }
    const result = importBuoyData(
      req.file,
      req.body.source || 'buoy_data.csv',
      req.body.remark
    )
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.post('/equipment', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传文件' })
      return
    }
    const result = importEquipment(req.file)
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.post('/run-inspection', (req: Request, res: Response) => {
  try {
    const { batchId } = req.body
    const result = runInspection(batchId)
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.get('/batches', (_req: Request, res: Response) => {
  try {
    const result = getBatches()
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
