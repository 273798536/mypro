import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import batchesRoutes from './routes/batches.js'
import spectraRoutes from './routes/spectra.js'
import attributionsRoutes from './routes/attributions.js'
import concentrationRoutes from './routes/concentration.js'
import temperaturesRoutes from './routes/temperatures.js'
import reviewsRoutes from './routes/reviews.js'
import exportsRoutes from './routes/exports.js'
import logsRoutes from './routes/logs.js'
import './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/batches', batchesRoutes)
app.use('/api/batches/:batchId/spectra', spectraRoutes)
app.use('/api/batches/:batchId/attributions', attributionsRoutes)
app.use('/api/batches/:batchId/concentration', concentrationRoutes)
app.use('/api/batches/:batchId/temperatures', temperaturesRoutes)
app.use('/api/batches/:batchId/reviews', reviewsRoutes)
app.use('/api/batches/:batchId', exportsRoutes)
app.use('/api/batches/:batchId/logs', logsRoutes)

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
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误',
    actionableHint: '请稍后重试或联系管理员',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'API接口不存在',
    actionableHint: '请检查请求路径是否正确',
  })
})

export default app
