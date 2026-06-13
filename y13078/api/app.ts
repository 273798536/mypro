/**
 * This is a API server
 * Cold Aisle Profile System - 数据中心冷通道剖面讲解系统
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pointsRoutes from './routes/points'
import viewsRoutes from './routes/views'
import detectRoutes from './routes/detect'
import exportRoutes from './routes/export'
import summaryRoutes from './routes/summary'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

/**
 * API Routes
 */
app.use('/api/points', pointsRoutes)
app.use('/api/views', viewsRoutes)
app.use('/api/detect', detectRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/summary', summaryRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
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
