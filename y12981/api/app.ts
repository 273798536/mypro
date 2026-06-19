/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import fs from 'fs'
import db, { initDatabase } from './db/database.js'
import { initBoundaryCases, initMockData } from './data/boundaryCases.js'
import diagnosisRoutes from './routes/diagnosis.js'
import auditRoutes from './routes/audit.js'
import dictionaryRoutes from './routes/dictionary.js'
import permissionsRoutes from './routes/permissions.js'
import boundaryRoutes from './routes/boundary.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

initDatabase()
initBoundaryCases(db)
initMockData(db)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/diagnosis', diagnosisRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/dictionary', dictionaryRoutes)
app.use('/api/permissions', permissionsRoutes)
app.use('/api/boundary', boundaryRoutes)

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
