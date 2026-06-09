import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import snapshotRoutes from './routes/snapshots.js'
import recordRoutes from './routes/records.js'
import detailRoutes from './routes/snapshotDetail.js'
import { initDatabase } from './db/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const uploadsDir = path.resolve(__dirname, '..', 'uploads')
const exportsDir = path.resolve(__dirname, '..', 'exports')
app.use('/uploads', express.static(uploadsDir))
app.use('/exports', express.static(exportsDir))

app.use('/api/snapshots', snapshotRoutes)
app.use('/api/snapshots/:id/records', recordRoutes)
app.use('/api/snapshots/:id', detailRoutes)

app.get(
  '/api/health',
  (req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
