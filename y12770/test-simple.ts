import express from 'express'

console.log('Starting test server...')

const app = express()
const PORT = 3001

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Test server ready on port ${PORT}`)
})
