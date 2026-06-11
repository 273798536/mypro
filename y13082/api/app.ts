import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './db/database.js'
import { runSeed } from './db/seed.js'

import batchRoutes from './routes/batches.js'
import collisionRoutes from './routes/collisions.js'
import historyRoutes from './routes/history.js'
import anomaliesRoutes from './routes/anomalies.js'
import viewsRoutes from './routes/views.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()
runSeed()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/batches', batchRoutes)
app.use('/api/collisions', collisionRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/anomalies', anomaliesRoutes)
app.use('/api/views', viewsRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: '码头危险品库碰撞预审服务运行中',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: '服务端内部错误：' + error.message,
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API 不存在：' + req.method + ' ' + req.url,
  })
})

export default app
