/**
 * 服装打版样衣异常回执状态机 API 服务
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDb } from './db/connection.js'
import batchRoutes from './routes/batches.js'
import documentRoutes from './routes/documents.js'
import reviewRoutes from './routes/review.js'
import taskRoutes from './routes/tasks.js'
import reportRoutes from './routes/reports.js'
import auditRoutes from './routes/audit.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

// 初始化数据库
initDb()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/batches', batchRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/review', reviewRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/audit', auditRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
