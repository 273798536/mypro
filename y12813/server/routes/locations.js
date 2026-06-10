const express = require('express')
const router = express.Router()
const db = () => global._db

router.get('/', (req, res) => {
  const { keyword, area, building } = req.query
  let sql = `SELECT * FROM sampling_locations WHERE 1=1`
  const params = []
  if (keyword) {
    sql += ` AND (code LIKE ? OR name LIKE ? OR description LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (area) {
    sql += ` AND area = ?`
    params.push(area)
  }
  if (building) {
    sql += ` AND building = ?`
    params.push(building)
  }
  sql += ` ORDER BY code`
  const rows = db().prepare(sql).all(...params)
  res.json({ data: rows })
})

router.get('/:id', (req, res) => {
  const row = db().prepare(`SELECT * FROM sampling_locations WHERE id = ?`).get(req.params.id)
  if (!row) return res.status(404).json({ error: '采样地点不存在' })
  res.json({ data: row })
})

router.post('/', (req, res) => {
  const { code, name, area, building, floor, description } = req.body
  if (!code || !name) {
    return res.status(400).json({ error: '编号和名称不能为空' })
  }
  try {
    const info = db().prepare(`
      INSERT INTO sampling_locations (code, name, area, building, floor, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(code, name, area, building, floor, description)
    const row = db().prepare(`SELECT * FROM sampling_locations WHERE id = ?`).get(info.lastInsertRowid)
    res.json({ data: row })
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该地点编号已存在' })
    }
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', (req, res) => {
  const { code, name, area, building, floor, description } = req.body
  db().prepare(`
    UPDATE sampling_locations SET code=?, name=?, area=?, building=?, floor=?, description=?, updated_at=datetime('now', 'localtime')
    WHERE id = ?
  `).run(code, name, area, building, floor, description, req.params.id)
  const row = db().prepare(`SELECT * FROM sampling_locations WHERE id = ?`).get(req.params.id)
  res.json({ data: row })
})

router.delete('/:id', (req, res) => {
  const used = db().prepare(`SELECT COUNT(*) as cnt FROM trap_records WHERE location_id = ?`).get(req.params.id)
  if (used.cnt > 0) {
    return res.status(400).json({ error: '该地点已有使用记录，无法删除' })
  }
  db().prepare(`DELETE FROM sampling_locations WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

module.exports = router
