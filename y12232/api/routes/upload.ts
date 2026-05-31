import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { Router } from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(__dirname, '../../data/imports')
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 xlsx、xls、csv 格式文件'))
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

const router = Router()

router.post('/', upload.single('file'), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请上传文件' })
    return
  }
  res.json({
    success: true,
    data: {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    },
  })
})

export { upload }
export default router
