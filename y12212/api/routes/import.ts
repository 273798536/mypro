import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import { getDb } from '../database/init.js'
import { processImport } from '../services/importService.js'
import type { ImportTask, ImportType } from '../../shared/types.js'

const router = Router()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'))
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({ storage })

router.get('/tasks', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const tasks = db.prepare('SELECT * FROM import_task ORDER BY created_at DESC').all() as ImportTask[]
    res.json({ success: true, data: tasks })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/upload', upload.single('file'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传文件' })
      return
    }

    const type = req.query.type as ImportType
    if (!type || !['profile', 'price', 'payment'].includes(type)) {
      res.status(400).json({ success: false, error: '导入类型无效，支持: profile, price, payment' })
      return
    }

    const createdBy = (req.headers['x-user-id'] as string) || 'anonymous'
    const result = processImport(req.file.path, type, createdBy)

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const task = db.prepare('SELECT * FROM import_task WHERE id = ?').get(req.params.id) as ImportTask | undefined

    if (!task) {
      res.status(404).json({ success: false, error: '导入任务不存在' })
      return
    }

    res.json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
