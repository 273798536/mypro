import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import contractsRouter from './routes/contracts.js'
import deferralRouter from './routes/deferral.js'
import reportsRouter from './routes/reports.js'
import rulesRouter from './routes/rules.js'
import recordsRouter from './routes/records.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/contracts', contractsRouter)
app.use('/api/deferral', deferralRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/rules', rulesRouter)
app.use('/api/records', recordsRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 体育会员会费递延工作台后端已启动`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`📊 API文档: http://localhost:${PORT}/api/health`)
})
