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
import taskQueueService from './services/TaskQueueService.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

// 初始化数据库
initDb()

// 注册任务处理器
function registerTaskHandlers() {
  taskQueueService.registerHandler('DOCUMENT_VALIDATION', async (payload) => {
    console.log('[Task] 执行单据验证:', payload.documentNo || payload.batchId)
    await new Promise(resolve => setTimeout(resolve, 500))
    if (payload.simulateError) {
      throw new Error('模拟网络错误: connection timeout')
    }
    console.log('[Task] 单据验证完成')
  })

  taskQueueService.registerHandler('DATA_SYNC', async (payload) => {
    console.log('[Task] 执行数据同步:', payload.target || 'ERP')
    await new Promise(resolve => setTimeout(resolve, 800))
    if (payload.simulateError) {
      throw new Error('模拟验证错误: invalid data format')
    }
    console.log('[Task] 数据同步完成')
  })

  taskQueueService.registerHandler('BATCH_PROCESS', async (payload) => {
    console.log('[Task] 执行批次处理:', payload.batchId)
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('[Task] 批次处理完成')
  })

  taskQueueService.registerHandler('REPORT_GENERATE', async (payload) => {
    console.log('[Task] 生成报告:', payload.type)
    await new Promise(resolve => setTimeout(resolve, 600))
    console.log('[Task] 报告生成完成')
  })

  console.log('[TaskQueue] 任务处理器注册完成')
}

// 启动任务队列
registerTaskHandlers()
if (process.env.NODE_ENV !== 'test') {
  taskQueueService.start().then(() => {
    console.log('[TaskQueue] 任务队列已启动，后台处理中...')
  }).catch(err => {
    console.error('[TaskQueue] 启动失败:', err)
  })
}

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
