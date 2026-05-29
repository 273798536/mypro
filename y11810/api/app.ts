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
import channelRoutes from './routes/channels.js'
import dataRoutes from './routes/data.js'
import settlementRoutes from './routes/settlement.js'
import exceptionRoutes from './routes/exceptions.js'
import billRoutes from './routes/bills.js'
import traceMiddleware from './middleware/trace.js'
import authMiddleware from './middleware/auth.js'
import actionLogMiddleware from './middleware/actionLog.js'
import errorHandlerMiddleware from './middleware/errorHandler.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(traceMiddleware)

/**
 * Public Routes (no auth required)
 */
app.use('/api/auth', authRoutes)

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
 * Auth & Action Log Middleware (apply to all other routes)
 */
app.use(authMiddleware)
app.use(actionLogMiddleware)

/**
 * Protected API Routes
 */
app.use('/api/channels', channelRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/settlement', settlementRoutes)
app.use('/api/exceptions', exceptionRoutes)
app.use('/api/bills', billRoutes)

/**
 * error handler middleware
 */
app.use(errorHandlerMiddleware)

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
