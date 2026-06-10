const express = require('express')
const cors = require('cors')
const path = require('path')
const { getDb } = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

async function bootstrap() {
  const db = await getDb()
  global._db = db

  app.use('/api/locations', require('./routes/locations'))
  app.use('/api/batches', require('./routes/batches'))
  app.use('/api/records', require('./routes/records'))
  app.use('/api/import', require('./routes/import'))
  app.use('/api/reports', require('./routes/reports'))

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '昆虫诱捕记录看板后端服务运行正常', timestamp: new Date().toISOString() })
  })

  app.get('/api/dashboard/overview', (req, res) => {
    const summary = db.prepare(`
      SELECT
        COUNT(r.id) as total_records,
        (SELECT COUNT(*) FROM trap_batches) as total_batches,
        (SELECT COUNT(*) FROM sampling_locations) as total_locations,
        SUM(CASE WHEN r.sample_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
        SUM(CASE WHEN r.sample_status = 'boundary' THEN 1 ELSE 0 END) as boundary_count,
        SUM(CASE WHEN r.sample_status = 'bad' THEN 1 ELSE 0 END) as bad_count,
        SUM(CASE WHEN r.sample_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN r.is_duplicate = 1 THEN 1 ELSE 0 END) as duplicate_count,
        SUM(r.insect_count) as total_insect_count
      FROM trap_records r
    `).get()

    const recentBatches = db.prepare(`
      SELECT b.*,
        COUNT(r.id) as record_count,
        SUM(CASE WHEN r.sample_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN r.is_duplicate = 1 THEN 1 ELSE 0 END) as duplicate_count
      FROM trap_batches b
      LEFT JOIN trap_records r ON r.batch_id = b.id
      GROUP BY b.id
      ORDER BY b.trap_date DESC, b.id DESC
      LIMIT 10
    `).all()

    const pendingRecords = db.prepare(`
      SELECT r.id, r.record_no, r.insect_count, r.created_at,
             b.batch_no, b.trap_date,
             l.code as location_code, l.name as location_name
      FROM trap_records r
      LEFT JOIN trap_batches b ON b.id = r.batch_id
      LEFT JOIN sampling_locations l ON l.id = r.location_id
      WHERE r.sample_status = 'pending'
      ORDER BY b.trap_date DESC, r.id DESC
      LIMIT 20
    `).all()

    const duplicateRecords = db.prepare(`
      SELECT r.id, r.record_no, r.is_duplicate, r.duplicate_of_id,
             orig.record_no as duplicate_of_no,
             b.batch_no, l.code as location_code, l.name as location_name
      FROM trap_records r
      LEFT JOIN trap_records orig ON orig.id = r.duplicate_of_id
      LEFT JOIN trap_batches b ON b.id = r.batch_id
      LEFT JOIN sampling_locations l ON l.id = r.location_id
      WHERE r.is_duplicate = 1
      ORDER BY r.created_at DESC
      LIMIT 20
    `).all()

    res.json({
      data: {
        summary,
        recentBatches,
        pendingRecords,
        duplicateRecords
      }
    })
  })

  app.listen(PORT, () => {
    console.log(`昆虫诱捕记录看板后端服务已启动: http://localhost:${PORT}`)
    console.log(`数据库文件: ${path.join(__dirname, 'db', 'insect_trap.db')}`)
  })
}

bootstrap().catch(err => {
  console.error('服务启动失败:', err)
  process.exit(1)
})
