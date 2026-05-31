import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import importRoutes from './routes/import.js'
import verifyRoutes from './routes/verify.js'
import reviewRoutes from './routes/review.js'
import exportRoutes from './routes/export.js'
import uploadRoutes from './routes/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const dataDir = path.resolve(__dirname, '../data')
const importsDir = path.join(dataDir, 'imports')
const exportsDir = path.join(dataDir, 'exports')
if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true })
if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true })

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/import', importRoutes)
app.use('/api/verify', verifyRoutes)
app.use('/api/review', reviewRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/upload', uploadRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
