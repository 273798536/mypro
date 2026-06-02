import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import deviceRoutes from './routes/devices'
import recordRoutes from './routes/records'
import anomalyRoutes from './routes/anomalies'
import inventoryRoutes from './routes/inventory'
import importExportRoutes from './routes/importExport'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/devices', deviceRoutes)
app.use('/api/records', recordRoutes)
app.use('/api/anomalies', anomalyRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api', importExportRoutes)

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
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API不存在',
  })
})

export default app
