import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import db from './db/database.js'
import expendituresRouter from './routes/expenditures.js'
import invoicesRouter from './routes/invoices.js'
import approvalsRouter from './routes/approvals.js'
import opinionsRouter from './routes/opinions.js'
import delaysRouter from './routes/delays.js'
import disclosuresRouter from './routes/disclosures.js'
import auditLogsRouter from './routes/audit-logs.js'
import traceRouter from './routes/trace.js'
import reportsRouter from './routes/reports.js'
import dashboardRouter from './routes/dashboard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/db/reset', async (req: Request, res: Response) => {
  await db.reset()
  await db.seed()
  res.json({ success: true, message: '数据库已重置并填充种子数据' })
})

app.get('/api/db/seed', async (req: Request, res: Response) => {
  await db.seed()
  res.json({ success: true, message: '种子数据已填充' })
})

app.use('/api/expenditures', expendituresRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/approvals', approvalsRouter)
app.use('/api/opinions', opinionsRouter)
app.use('/api/delays', delaysRouter)
app.use('/api/disclosures', disclosuresRouter)
app.use('/api/audit-logs', auditLogsRouter)
app.use('/api/trace', traceRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/dashboard', dashboardRouter)

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
  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error: ' + error.message,
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
