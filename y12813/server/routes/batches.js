const express = require('express')
const dayjs = require('dayjs')
const router = express.Router()
const db = () => global._db

router.get('/', (req, res) => {
  const { dateFrom, dateTo, hasBatchEffect, keyword } = req.query
  let sql = `
    SELECT b.*, COUNT(r.id) as record_count,
           SUM(CASE WHEN r.sample_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
           SUM(CASE WHEN r.sample_status = 'boundary' THEN 1 ELSE 0 END) as boundary_count,
           SUM(CASE WHEN r.sample_status = 'bad' THEN 1 ELSE 0 END) as bad_count,
           SUM(CASE WHEN r.sample_status = 'pending' THEN 1 ELSE 0 END) as pending_count
    FROM trap_batches b
    LEFT JOIN trap_records r ON r.batch_id = b.id
    WHERE 1=1
  `
  const params = []
  if (dateFrom) {
    sql += ` AND b.trap_date >= ?`
    params.push(dateFrom)
  }
  if (dateTo) {
    sql += ` AND b.trap_date <= ?`
    params.push(dateTo)
  }
  if (hasBatchEffect !== undefined && hasBatchEffect !== '') {
    sql += ` AND b.has_batch_effect = ?`
    params.push(hasBatchEffect)
  }
  if (keyword) {
    sql += ` AND (b.batch_no LIKE ? OR b.operator LIKE ? OR b.remark LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  sql += ` GROUP BY b.id ORDER BY b.trap_date DESC, b.id DESC`
  const rows = db().prepare(sql).all(...params)
  res.json({ data: rows })
})

router.get('/:id', (req, res) => {
  const batch = db().prepare(`SELECT * FROM trap_batches WHERE id = ?`).get(req.params.id)
  if (!batch) return res.status(404).json({ error: '批次不存在' })
  const records = db().prepare(`
    SELECT r.*, l.code as location_code, l.name as location_name,
           l.area as location_area, l.building as location_building, l.floor as location_floor
    FROM trap_records r
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    WHERE r.batch_id = ?
    ORDER BY r.id
  `).all(req.params.id)
  res.json({ data: { ...batch, records } })
})

router.post('/', (req, res) => {
  const { batch_no, trap_date, operator, trap_type, weather, temperature, humidity, remark } = req.body
  if (!batch_no || !trap_date || !operator) {
    return res.status(400).json({ error: '批次号、诱捕日期、操作员不能为空' })
  }
  try {
    const info = db().prepare(`
      INSERT INTO trap_batches (batch_no, trap_date, operator, trap_type, weather, temperature, humidity, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(batch_no, trap_date, operator, trap_type, weather, temperature, humidity, remark)
    const row = db().prepare(`SELECT * FROM trap_batches WHERE id = ?`).get(info.lastInsertRowid)
    res.json({ data: row })
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该批次号已存在' })
    }
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', (req, res) => {
  const { trap_date, operator, trap_type, weather, temperature, humidity, remark, has_batch_effect, batch_effect_note } = req.body
  db().prepare(`
    UPDATE trap_batches SET trap_date=?, operator=?, trap_type=?, weather=?, temperature=?, humidity=?, remark=?,
    has_batch_effect=?, batch_effect_note=?, updated_at=datetime('now', 'localtime')
    WHERE id = ?
  `).run(trap_date, operator, trap_type, weather, temperature, humidity, remark, has_batch_effect ? 1 : 0, batch_effect_note, req.params.id)
  const row = db().prepare(`SELECT * FROM trap_batches WHERE id = ?`).get(req.params.id)
  res.json({ data: row })
})

router.delete('/:id', (req, res) => {
  const used = db().prepare(`SELECT COUNT(*) as cnt FROM trap_records WHERE batch_id = ?`).get(req.params.id)
  if (used.cnt > 0) {
    return res.status(400).json({ error: '该批次下已有记录，无法删除' })
  }
  db().prepare(`DELETE FROM trap_batches WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

router.get('/:id/trace', (req, res) => {
  const batch = db().prepare(`SELECT * FROM trap_batches WHERE id = ?`).get(req.params.id)
  if (!batch) return res.status(404).json({ error: '批次不存在' })

  const records = db().prepare(`
    SELECT r.*, l.code as location_code, l.name as location_name,
           l.area as location_area, l.building as location_building
    FROM trap_records r
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    WHERE r.batch_id = ?
    ORDER BY r.id
  `).all(req.params.id)

  const recordIds = records.map(r => r.id)
  let changelogs = []
  let reviewComments = []
  let importInfo = null

  if (recordIds.length > 0) {
    const placeholders = recordIds.map(() => '?').join(',')
    changelogs = db().prepare(`
      SELECT c.* FROM record_changelog c
      WHERE c.record_id IN (${placeholders})
      ORDER BY c.changed_at DESC
    `).all(...recordIds)

    reviewComments = db().prepare(`
      SELECT rc.* FROM review_comments rc
      WHERE rc.record_id IN (${placeholders})
      ORDER BY rc.created_at DESC
    `).all(...recordIds)

    const firstRecord = records[0]
    if (firstRecord && firstRecord.source_import_id) {
      importInfo = db().prepare(`SELECT * FROM import_logs WHERE id = ?`).get(firstRecord.source_import_id)
    }
  }

  res.json({
    data: {
      batch,
      records,
      changelogs,
      reviewComments,
      importInfo
    }
  })
})

module.exports = router
