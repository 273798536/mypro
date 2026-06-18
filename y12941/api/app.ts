/**
 * This is a API server
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
import { initDatabase } from './db/connection.ts'
import authRoutes from './routes/auth.ts'
import conversationRoutes from './routes/conversations.ts'
import materialRoutes from './routes/material.ts'
import reportRoutes from './routes/report.ts'
import promptRoutes from './routes/prompt.ts'
import statsRoutes from './routes/stats.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/material', materialRoutes)
app.use('/api/report', reportRoutes)
app.use('/api/prompt-versions', promptRoutes)
app.use('/api/stats', statsRoutes)

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
