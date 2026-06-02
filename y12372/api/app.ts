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
import authRoutes from './routes/auth.js'
import overviewRoutes from './routes/overview.js'
import worksRoutes from './routes/works.js'
import correctionsRoutes from './routes/corrections.js'
import appealsRoutes from './routes/appeals.js'
import importRoutes from './routes/import.js'
import reportsRoutes from './routes/reports.js'
import { initDatabase } from './database.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

// initialize database
initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/overview', overviewRoutes)
app.use('/api/works', worksRoutes)
app.use('/api/corrections', correctionsRoutes)
app.use('/api/appeals', appealsRoutes)
app.use('/api/import', importRoutes)
app.use('/api/reports', reportsRoutes)

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
