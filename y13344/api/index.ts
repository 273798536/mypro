import express from 'express'
import cors from 'cors'
import db from './db.js'
import { seedDatabase } from './seed.js'
import evaluationsRouter from './routes/evaluations.js'
import correctionsRouter from './routes/corrections.js'
import compareRouter from './routes/compare.js'
import rerunRouter from './routes/rerun.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/evaluations', evaluationsRouter)
app.use('/api/corrections', correctionsRouter)
app.use('/api/compare', compareRouter)
app.use('/api', rerunRouter)

seedDatabase()

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})

process.on('SIGINT', () => {
  db.close()
  process.exit(0)
})
