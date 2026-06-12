import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import './db.js'
import sampleRoutes from './routes/samples.js'
import anomalyRoutes from './routes/anomalies.js'
import buoyRoutes from './routes/buoy.js'
import tideRoutes from './routes/tide.js'
import aquacultureRoutes from './routes/aquaculture.js'
import stationRoutes from './routes/stations.js'
import dashboardRoutes from './routes/dashboard.js'
import reportRoutes from './routes/report.js'
import auditRoutes from './routes/audit.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/samples', sampleRoutes)
app.use('/api/anomalies', anomalyRoutes)
app.use('/api/buoy', buoyRoutes)
app.use('/api/tide', tideRoutes)
app.use('/api/aquaculture-log', aquacultureRoutes)
app.use('/api/stations', stationRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/report', reportRoutes)
app.use('/api/audit-log', auditRoutes)

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
