import express, {
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import batchRoutes from './routes/batches.js'
import materialRoutes from './routes/materials.js'
import anomalyRoutes from './routes/anomalies.js'
import calculationRoutes from './routes/calculations.js'
import reportRoutes from './routes/reports.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/batches', batchRoutes)
app.use('/api', materialRoutes)
app.use('/api/anomalies', anomalyRoutes)
app.use('/api', calculationRoutes)
app.use('/api', reportRoutes)

app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((_err: unknown, _req: Request, res: Response, _next: () => void) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
