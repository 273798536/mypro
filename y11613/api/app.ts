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
import { initDatabase } from './database/init.js'
import storeRoutes from './routes/stores.js'
import cardRoutes from './routes/cards.js'
import rechargeRoutes from './routes/recharge.js'
import consumeRoutes from './routes/consume.js'
import refundRoutes from './routes/refund.js'
import ruleRoutes from './routes/rules.js'
import auditRoutes from './routes/audit.js'
import dashboardRoutes from './routes/dashboard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/stores', storeRoutes)
app.use('/api/cards', cardRoutes)
app.use('/api/recharge', rechargeRoutes)
app.use('/api/consume', consumeRoutes)
app.use('/api/refund', refundRoutes)
app.use('/api/rules', ruleRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/dashboard', dashboardRoutes)

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
