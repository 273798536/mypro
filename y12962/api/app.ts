import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import runsRoutes from './routes/runs.js'
import issuesRoutes from './routes/issues.js'
import downloadRoutes from './routes/download.js'
import demoRoutes from './routes/demo.js'
import { migrate } from './db/schema.js'
import { seed } from './db/seed.js'
import { isSeeded } from './db/schema.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

function initDb(): void {
  migrate()
  if (!isSeeded()) {
    seed()
    console.log('[db] 首次启动，已注入示例数据')
  }
}
initDb()

app.use('/api/auth', authRoutes)
app.use('/api/runs', runsRoutes)
app.use('/api/issues', issuesRoutes)
app.use('/api/download', downloadRoutes)
app.use('/api/demo', demoRoutes)

app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[error]', error.message)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
