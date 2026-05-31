import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import multer from 'multer'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './database/init.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import importRoutes from './routes/import.js'
import billRoutes from './routes/bills.js'
import exceptionRoutes from './routes/exceptions.js'
import reportRoutes from './routes/report.js'
import configRoutes from './routes/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(process.cwd(), 'uploads'))
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, uniqueSuffix + '-' + file.originalname)
    },
  }),
})

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/import', importRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/exceptions', exceptionRoutes)
app.use('/api/report', reportRoutes)
app.use('/api/config', configRoutes)

app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
