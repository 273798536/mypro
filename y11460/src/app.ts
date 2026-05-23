import express from 'express'
import path from 'path'
import fs from 'fs'
import authRoutes from './routes/auth'
import receiptRoutes from './routes/receipts'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const uploadDir = './uploads'
const exportDir = './exports'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/receipts', receiptRoutes)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: '服务器内部错误', message: err.message })
})

export default app
