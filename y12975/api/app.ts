import express, {
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import driftRoutes from './routes/drift.js'
import auditRoutes from './routes/audit.js'
import slowQueryRoutes from './routes/slow-query.js'
import rollbackRoutes from './routes/rollback.js'
import materialsRoutes from './routes/materials.js'
import dashboardRoutes from './routes/dashboard.js'
import snapshotRoutes from './routes/snapshot.js'
import historyRoutes from './routes/history.js'
import downloadRoutes from './routes/download.js'
import testsRoutes from './routes/tests.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/drift', driftRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/slow-query', slowQueryRoutes)
app.use('/api/rollback', rollbackRoutes)
app.use('/api/materials', materialsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/snapshot', snapshotRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/download', downloadRoutes)
app.use('/api/tests', testsRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      ok: true,
      data: { status: 'ok' },
    })
  },
)

app.use((error: Error, _req: Request, res: Response): void => {
  res.status(500).json({
    ok: false,
    error: error.message || 'Server internal error',
  })
})

app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    ok: false,
    error: 'API not found',
  })
})

export default app
