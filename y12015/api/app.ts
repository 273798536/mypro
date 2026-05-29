import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import importRoutes from './routes/import.js'
import allocationRoutes from './routes/allocation.js'
import correctionRoutes from './routes/correction.js'
import exportRoutes from './routes/export.js'
import { initDatabase, seedDemoData } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()
seedDemoData()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/import', importRoutes)
app.use('/api/allocation', allocationRoutes)
app.use('/api/correction', correctionRoutes)
app.use('/api/export', exportRoutes)

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
