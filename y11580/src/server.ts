import express from 'express'
import { CONFIG } from './config'
import { connectDB } from './lib/prisma'
import { batchesRouter } from './routes/batches'
import { supervisorRouter } from './routes/supervisor'

const app = express()

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'store-member-value-exception-statemachine'
  })
})

app.use('/api/batches', batchesRouter)
app.use('/api/supervisor', supervisorRouter)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

async function startServer() {
  await connectDB()
  
  app.listen(CONFIG.PORT, () => {
    console.log(`Server running on http://localhost:${CONFIG.PORT}`)
    console.log(`Health check: http://localhost:${CONFIG.PORT}/health`)
  })
}

startServer().catch(console.error)
