const express = require('express')
const router = express.Router()
const db = () => global._db

function logChange(recordId, fieldName, oldValue, newValue, changedBy) {
  if (String(oldValue) !== String(newValue)) {
    db().prepare(`
      INSERT INTO record_changelog (record_id, field_name, old_value, new_value, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(recordId, fieldName, oldValue ? String(oldValue) : null, newValue ? String(newValue) : null, changedBy || 'system')
  }
}

router.get('/', (req, res) => {
  const { batch_id, location_id, sample_status, is_duplicate, keyword, dateFrom, dateTo, page, pageSize } = req.query
  let countSql = `SELECT COUNT(*) as total FROM trap_records r WHERE 1=1`
  let dataSql = `
    SELECT r.*, b.batch_no, b.trap_date, b.operator as batch_operator,
           b.has_batch_effect,
           l.code as location_code, l.name as location_name,
           l.area as location_area, l.building as location_building, l.floor as location_floor,
           orig.record_no as duplicate_of_no
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    LEFT JOIN trap_records orig ON orig.id = r.duplicate_of_id
    WHERE 1=1
  `
  const params = []
  const countParams = []

  if (batch_id) {
    dataSql += ` AND r.batch_id = ?`; countSql += ` AND batch_id = ?`
    params.push(batch_id); countParams.push(batch_id)
  }
  if (location_id) {
    dataSql += ` AND r.location_id = ?`; countSql += ` AND location_id = ?`
    params.push(location_id); countParams.push(location_id)
  }
  if (sample_status) {
    dataSql += ` AND r.sample_status = ?`; countSql += ` AND sample_status = ?`
    params.push(sample_status); countParams.push(sample_status)
  }
  if (is_duplicate !== undefined && is_duplicate !== '') {
    dataSql += ` AND r.is_duplicate = ?`; countSql += ` AND is_duplicate = ?`
    params.push(is_duplicate); countParams.push(is_duplicate)
  }
  if (dateFrom) {
    dataSql += ` AND b.trap_date >= ?`; countSql += ` AND EXISTS (SELECT 1 FROM trap_batches WHERE id=r.batch_id AND trap_date >= ?)`
    params.push(dateFrom); countParams.push(dateFrom)
  }
  if (dateTo) {
    dataSql += ` AND b.trap_date <= ?`; countSql += ` AND EXISTS (SELECT 1 FROM trap_batches WHERE id=r.batch_id AND trap_date <= ?)`
    params.push(dateTo); countParams.push(dateTo)
  }
  if (keyword) {
    dataSql += ` AND (r.record_no LIKE ? OR b.batch_no LIKE ? OR l.code LIKE ? OR l.name LIKE ? OR r.conclusion LIKE ?)`
    countSql += ` AND (
      record_no LIKE ?
      OR EXISTS (SELECT 1 FROM trap_batches WHERE id=trap_records.batch_id AND batch_no LIKE ?)
      OR EXISTS (SELECT 1 FROM sampling_locations WHERE id=trap_records.location_id AND (code LIKE ? OR name LIKE ?))
      OR conclusion LIKE ?
    )`
    const kw = `%${keyword}%`
    params.push(kw, kw, kw, kw, kw)
    countParams.push(kw, kw, kw, kw, kw)
  }

  dataSql += ` ORDER BY b.trap_date DESC, r.id DESC`

  const p = parseInt(page) || 1
  const ps = parseInt(pageSize) || 20
  if (page && pageSize) {
    dataSql += ` LIMIT ? OFFSET ?`
    params.push(ps, (p - 1) * ps)
  }

  const total = db().prepare(countSql).get(...countParams).total
  const rows = db().prepare(dataSql).all(...params)
  res.json({ data: rows, total, page: p, pageSize: ps })
})

router.get('/:id', (req, res) => {
  const record = db().prepare(`
    SELECT r.*, b.batch_no, b.trap_date, b.operator as batch_operator,
           b.trap_type, b.weather, b.temperature, b.humidity, b.remark as batch_remark,
           b.has_batch_effect, b.batch_effect_note,
           l.code as location_code, l.name as location_name,
           l.area as location_area, l.building as location_building, l.floor as location_floor, l.description as location_description,
           orig.record_no as duplicate_of_no
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    LEFT JOIN trap_records orig ON orig.id = r.duplicate_of_id
    WHERE r.id = ?
  `).get(req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })

  const comments = db().prepare(`SELECT * FROM review_comments WHERE record_id = ? ORDER BY created_at DESC`).all(req.params.id)
  const changelogs = db().prepare(`SELECT * FROM record_changelog WHERE record_id = ? ORDER BY changed_at DESC`).all(req.params.id)
  const duplicates = db().prepare(`
    SELECT r.*, b.batch_no, l.code as location_code, l.name as location_name
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    WHERE r.duplicate_of_id = ?
  `).all(req.params.id)
  let importInfo = null
  if (record.source_import_id) {
    importInfo = db().prepare(`SELECT * FROM import_logs WHERE id = ?`).get(record.source_import_id)
  }

  res.json({ data: { ...record, comments, changelogs, duplicates, importInfo } })
})

router.post('/', (req, res) => {
  const { record_no, batch_id, location_id, trap_start_time, trap_end_time,
          insect_count, insect_types, sample_status, quality_score, photo_path,
          collected_by, conclusion, operator } = req.body
  if (!record_no || !batch_id || !location_id) {
    return res.status(400).json({ error: '记录编号、批次、采样地点不能为空' })
  }
  const existing = db().prepare(`SELECT id FROM trap_records WHERE record_no = ?`).get(record_no)
  if (existing) {
    return res.status(400).json({ error: '该记录编号已存在', duplicate: true })
  }
  try {
    const info = db().prepare(`
      INSERT INTO trap_records (record_no, batch_id, location_id, trap_start_time, trap_end_time,
        insect_count, insect_types, sample_status, quality_score, photo_path, collected_by, conclusion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(record_no, batch_id, location_id, trap_start_time, trap_end_time,
           insect_count || 0, insect_types, sample_status || 'pending', quality_score, photo_path, collected_by, conclusion)
    const row = db().prepare(`SELECT * FROM trap_records WHERE id = ?`).get(info.lastInsertRowid)
    res.json({ data: row })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', (req, res) => {
  const old = db().prepare(`SELECT * FROM trap_records WHERE id = ?`).get(req.params.id)
  if (!old) return res.status(404).json({ error: '记录不存在' })

  const { trap_start_time, trap_end_time, insect_count, insect_types,
          sample_status, quality_score, photo_path, collected_by, reviewed_by,
          conclusion, operator } = req.body

  db().prepare(`
    UPDATE trap_records SET trap_start_time=?, trap_end_time=?, insect_count=?, insect_types=?,
      sample_status=?, quality_score=?, photo_path=?, collected_by=?, reviewed_by=?,
      reviewed_at=CASE WHEN ? IS NOT NULL THEN datetime('now', 'localtime') ELSE reviewed_at END,
      conclusion=?, updated_at=datetime('now', 'localtime')
    WHERE id = ?
  `).run(trap_start_time, trap_end_time, insect_count || 0, insect_types,
         sample_status, quality_score, photo_path, collected_by, reviewed_by,
         sample_status && sample_status !== 'pending' ? reviewed_by : null,
         conclusion, req.params.id)

  logChange(req.params.id, 'sample_status', old.sample_status, sample_status, operator || reviewed_by)
  logChange(req.params.id, 'conclusion', old.conclusion, conclusion, operator || reviewed_by)
  logChange(req.params.id, 'insect_count', old.insect_count, insect_count, operator || reviewed_by)
  logChange(req.params.id, 'quality_score', old.quality_score, quality_score, operator || reviewed_by)

  const row = db().prepare(`SELECT * FROM trap_records WHERE id = ?`).get(req.params.id)
  res.json({ data: row })
})

router.delete('/:id', (req, res) => {
  db().prepare(`DELETE FROM trap_records WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

router.post('/:id/comments', (req, res) => {
  const { reviewer, comment, comment_type, previous_status, new_status } = req.body
  if (!reviewer || !comment) {
    return res.status(400).json({ error: '复核人和复核意见不能为空' })
  }
  const info = db().prepare(`
    INSERT INTO review_comments (record_id, reviewer, comment, comment_type, previous_status, new_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, reviewer, comment, comment_type || 'review', previous_status, new_status)

  if (new_status) {
    const old = db().prepare(`SELECT sample_status FROM trap_records WHERE id = ?`).get(req.params.id)
    db().prepare(`UPDATE trap_records SET sample_status=?, reviewed_by=?, reviewed_at=datetime('now', 'localtime') WHERE id = ?`)
      .run(new_status, reviewer, req.params.id)
    logChange(req.params.id, 'sample_status', old.sample_status, new_status, reviewer)
  }

  const row = db().prepare(`SELECT * FROM review_comments WHERE id = ?`).get(info.lastInsertRowid)
  res.json({ data: row })
})

router.get('/stats/summary', (req, res) => {
  const { dateFrom, dateTo } = req.query
  let where = '1=1'
  const params = []
  if (dateFrom) { where += ` AND b.trap_date >= ?`; params.push(dateFrom) }
  if (dateTo) { where += ` AND b.trap_date <= ?`; params.push(dateTo) }

  const sql = `
    SELECT
      COUNT(DISTINCT r.id) as total_records,
      COUNT(DISTINCT b.id) as total_batches,
      COUNT(DISTINCT r.location_id) as total_locations,
      SUM(CASE WHEN r.sample_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
      SUM(CASE WHEN r.sample_status = 'boundary' THEN 1 ELSE 0 END) as boundary_count,
      SUM(CASE WHEN r.sample_status = 'bad' THEN 1 ELSE 0 END) as bad_count,
      SUM(CASE WHEN r.sample_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN r.is_duplicate = 1 THEN 1 ELSE 0 END) as duplicate_count,
      SUM(r.insect_count) as total_insect_count,
      SUM(CASE WHEN b.has_batch_effect = 1 THEN 1 ELSE 0 END) as batch_effect_count
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    WHERE ${where}
  `
  const row = db().prepare(sql).get(...params)
  res.json({ data: row })
})

module.exports = router
