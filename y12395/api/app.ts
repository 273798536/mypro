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
import materialsRoutes from './routes/materials.js'
import normalizationRoutes from './routes/normalization.js'
import comparisonRoutes from './routes/comparison.js'
import searchRoutes from './routes/search.js'
import exportRoutes from './routes/export.js'
import { getDb } from './db.js'
import { seedDatabase } from './seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/materials', materialsRoutes)
app.use('/api/normalization', normalizationRoutes)
app.use('/api/comparison', comparisonRoutes)
app.use('/api/search', searchRoutes)
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

export function initializeApp(): void {
  getDb()
  seedDatabase()
  console.log('Database initialized and seeded')
}

export default app
