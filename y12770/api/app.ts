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
import weighingRoutes from './routes/weighing.js'
import analysisRoutes from './routes/analysis.js'
import balanceRoutes from './routes/balance.js'
import traceRoutes from './routes/trace.js'
import reportRoutes from './routes/report.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/weighing', weighingRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/balance', balanceRoutes)
app.use('/api/trace', traceRoutes)
app.use('/api/report', reportRoutes)

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
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Server internal error',
      actionable: '请稍后重试，或联系系统管理员',
    },
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: 'API not found',
      actionable: '请检查 API 路径是否正确',
    },
  })
})

export default app
