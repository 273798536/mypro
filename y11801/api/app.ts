import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { logger, requestId } from './middleware/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import importRoutes from './routes/import.js'
import pendingRoutes from './routes/pending.js'
import calculationRoutes from './routes/calculation.js'
import vehicleRoutes from './routes/vehicle.js'
import contractRoutes from './routes/contract.js'
import exportRoutes from './routes/export.js'
import auditRoutes from './routes/audit.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(requestId)
app.use(logger)

app.use('/api/auth', authRoutes)
app.use('/api/import', importRoutes)
app.use('/api/pending', pendingRoutes)
app.use('/api/calculation', calculationRoutes)
app.use('/api/vehicle', vehicleRoutes)
app.use('/api/contract', contractRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/audit-history', auditRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use(errorHandler)
app.use(notFoundHandler)

export default app
