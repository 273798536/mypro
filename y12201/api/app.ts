import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { Router } from 'express'
import authRoutes from './routes/auth.js'
import setupOrders from './routes/orders.js'
import setupReturns from './routes/returns.js'
import setupBills from './routes/bills.js'
import setupVatAccruals from './routes/vat-accruals.js'
import setupExceptions from './routes/exceptions.js'
import setupAuditLogs from './routes/audit-logs.js'
import setupReports from './routes/reports.js'
import setupSeed from './routes/seed.js'
import db from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)

const ordersRouter = Router()
setupOrders(ordersRouter)
app.use('/api/orders', ordersRouter)

const returnsRouter = Router()
setupReturns(returnsRouter)
app.use('/api/returns', returnsRouter)

const billsRouter = Router()
setupBills(billsRouter)
app.use('/api/bills', billsRouter)

const vatAccrualsRouter = Router()
setupVatAccruals(vatAccrualsRouter)
app.use('/api/vat-accruals', vatAccrualsRouter)

const exceptionsRouter = Router()
setupExceptions(exceptionsRouter)
app.use('/api/exceptions', exceptionsRouter)

const auditLogsRouter = Router()
setupAuditLogs(auditLogsRouter)
app.use('/api/audit-logs', auditLogsRouter)

const reportsRouter = Router()
setupReports(reportsRouter)
app.use('/api/reports', reportsRouter)

const seedRouter = Router()
setupSeed(seedRouter)
app.use('/api/seed', seedRouter)

app.get('/api/country-rates', (req: Request, res: Response): void => {
  const rates = db.prepare('SELECT * FROM country_rates ORDER BY country').all()
  res.json({ success: true, data: rates })
})

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
