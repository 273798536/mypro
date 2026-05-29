import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import './db.js'
import casesRoutes from './routes/cases.js'
import importRoutes from './routes/imports.js'
import pendingRoutes from './routes/pending.js'
import exportRoutes from './routes/export.js'
import statsRoutes from './routes/stats.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/cases', casesRoutes)
app.use('/api', importRoutes)
app.use('/api/pending', pendingRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/stats', statsRoutes)

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
