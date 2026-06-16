import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { seed } from './seed.js'
import complaintsRouter from './routes/complaints.js'
import mergesRouter from './routes/merges.js'
import historiesRouter from './routes/histories.js'
import exportRouter from './routes/export.js'

dotenv.config()

seed()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/complaints', complaintsRouter)
app.use('/api/merges', mergesRouter)
app.use('/api/histories', historiesRouter)
app.use('/api/export', exportRouter)

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
