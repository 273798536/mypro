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
import { initDatabase } from './db.js'

import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
import warningRoutes from './routes/warnings.js'
import versionRoutes from './routes/versions.js'
import correctionRoutes from './routes/corrections.js'
import groupRoutes from './routes/groups.js'
import importRoutes from './routes/import.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

// init database
initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/warnings', warningRoutes)
app.use('/api/versions', versionRoutes)
app.use('/api/corrections', correctionRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/import', importRoutes)

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
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
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
