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
import caseRoutes from './routes/cases.js'
import historyRoutes from './routes/history.js'
import { initDataStore } from './store/dataStore.js'

const __filename = fileURLToPath(import.meta.url)
void path.dirname(__filename)

dotenv.config()

void (async function bootstrap() {
  await initDataStore()
})()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/cases', caseRoutes)
app.use('/api/history', historyRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      code: 0,
      message: 'ok',
      data: { status: 'healthy' },
      timestamp: new Date().toISOString(),
    })
  },
)

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', error.message, error.stack)
  res.status(500).json({
    code: 500,
    message: `服务端错误：${error.message}`,
    data: null,
    timestamp: new Date().toISOString(),
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: 'API not found: ' + req.path,
    data: null,
    timestamp: new Date().toISOString(),
  })
})

export default app
