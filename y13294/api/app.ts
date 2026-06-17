/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import rampRoutes from './routes/ramps.js'
import listRoutes from './routes/list.js'
import exportRoutes from './routes/export.js'
import { initDb } from './db.js'

dotenv.config()
initDb()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/ramps', rampRoutes)
app.use('/api/list', listRoutes)
app.use('/api/export', exportRoutes)

/**
 * health
 */
app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = (error as { status?: number })?.status ?? 500
  res.status(status).json({
    success: false,
    ok: false,
    error: error.message || 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    ok: false,
    error: 'API not found',
  })
})

export default app
