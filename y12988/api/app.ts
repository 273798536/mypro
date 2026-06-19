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
import migrationRoutes from './routes/migrations.js'
import slowQueryLogRoutes from './routes/slowQueryLogs.js'
import migrationScriptRoutes from './routes/migrationScripts.js'
import conflictRoutes from './routes/conflicts.js'
import backupGapRoutes from './routes/backupGaps.js'
import snapshotRoutes from './routes/snapshots.js'
import conclusionRoutes from './routes/conclusions.js'
import indexSuggestionRoutes from './routes/indexSuggestions.js'
import { initDb } from './db.js'
import { seedData } from './seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDb()
seedData()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/migrations', migrationRoutes)
app.use('/api/slow-query-logs', slowQueryLogRoutes)
app.use('/api/migration-scripts', migrationScriptRoutes)
app.use('/api/conflicts', conflictRoutes)
app.use('/api/backup-gaps', backupGapRoutes)
app.use('/api/snapshots', snapshotRoutes)
app.use('/api/conclusions', conclusionRoutes)
app.use('/api/index-suggestions', indexSuggestionRoutes)

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
