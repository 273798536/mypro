import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getDb } from './db.js'
import { seedData } from './seed.js'
import authRoutes from './routes/auth.js'
import settlementRoutes from './routes/settlements.js'
import commissionRoutes from './routes/commission.js'
import consignmentRoutes from './routes/consignments.js'
import auditRoutes from './routes/audit.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

getDb()
seedData()

app.use('/api/auth', authRoutes)
app.use('/api/settlements', settlementRoutes)
app.use('/api', commissionRoutes)
app.use('/api/consignments', consignmentRoutes)
app.use('/api', auditRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
