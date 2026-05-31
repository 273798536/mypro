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
import dashboardRoutes from './routes/dashboard.js'
import memberRoutes from './routes/members.js'
import petRoutes from './routes/pets.js'
import transactionRoutes from './routes/transactions.js'
import packageRoutes from './routes/packages.js'
import exceptionRoutes from './routes/exceptions.js'
import { refundRouter, exportRouter } from './routes/refund.js'
import { initDatabase } from './db/init.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/pets', petRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/packages', packageRoutes)
app.use('/api/exceptions', exceptionRoutes)
app.use('/api/refund', refundRouter)
app.use('/api/export', exportRouter)

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
