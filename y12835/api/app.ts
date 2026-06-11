import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import { mkdirSync } from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { getDb } from './db.js'
import authRoutes from './routes/auth.js'
import recordRoutes from './routes/records.js'
import statisticsRoutes from './routes/statistics.js'
import lineageRoutes from './routes/lineage.js'
import anomalyRoutes from './routes/anomalies.js'
import importRoutes from './routes/import.js'
import reagentRoutes from './routes/reagents.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const uploadsDir = path.join(__dirname, '..', 'uploads')
mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

getDb()

app.use('/api/auth', authRoutes)
app.use('/api/records', recordRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/lineage', lineageRoutes)
app.use('/api/anomalies', anomalyRoutes)
app.use('/api/import', importRoutes)
app.use('/api/reagents', reagentRoutes)

app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('服务器错误:', error.message)

  if (error.name === 'MulterError') {
    const mulErr = error as { code?: string; message: string }
    if (mulErr.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, error: '文件大小超出限制，最大允许10MB' })
      return
    }
    res.status(400).json({ success: false, error: `文件上传失败：${mulErr.message}` })
    return
  }

  if (error.message?.includes('FOREIGN KEY')) {
    res.status(400).json({ success: false, error: '关联数据不存在，请检查外键引用是否正确' })
    return
  }

  if (error.message?.includes('CHECK constraint')) {
    res.status(400).json({ success: false, error: `数据验证失败：${error.message}` })
    return
  }

  res.status(500).json({
    success: false,
    error: '服务器内部错误，请稍后重试或联系管理员',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '请求的API接口不存在，请检查路径是否正确',
  })
})

export default app
