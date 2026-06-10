import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import lotsRouter from './routes/lots.js'
import bandsRouter from './routes/bands.js'
import diffRouter from './routes/diff.js'
import reviewRouter from './routes/review.js'
import exportRouter from './routes/export.js'
import demoRouter from './routes/demo.js'
import commonRouter from './routes/common.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/lots', lotsRouter)
app.use('/api/bands', bandsRouter)
app.use('/api/diff', diffRouter)
app.use('/api/review', reviewRouter)
app.use('/api/export', exportRouter)
app.use('/api/demo', demoRouter)
app.use('/api/common', commonRouter)

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
