const express = require('express')
const dayjs = require('dayjs')
const router = express.Router()
const db = () => global._db

function findDuplicate(record) {
  const { record_no, batch_id, location_id, trap_start_time, trap_end_time } = record
  if (record_no) {
    const existing = db().prepare(`SELECT id, record_no FROM trap_records WHERE record_no = ?`).get(record_no)
    if (existing) return existing
  }
  if (batch_id && location_id) {
    let sql = `SELECT id, record_no FROM trap_records WHERE batch_id = ? AND location_id = ?`
    const params = [batch_id, location_id]
    if (trap_start_time) { sql += ` AND trap_start_time = ?`; params.push(trap_start_time) }
    if (trap_end_time) { sql += ` AND trap_end_time = ?`; params.push(trap_end_time) }
    const existing = db().prepare(sql).get(...params)
    if (existing) return existing
  }
  return null
}

router.post('/batch', (req, res) => {
  const { records, imported_by, file_name, remark, import_mode = 'smart' } = req.body
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: '导入记录不能为空' })
  }

  const importBatchNo = 'IMP' + dayjs().format('YYYYMMDDHHmmss')
  const importLogInfo = db().prepare(`
    INSERT INTO import_logs (import_batch_no, file_name, total_count, imported_by, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(importBatchNo, file_name, records.length, imported_by || 'admin', remark)

  const importId = importLogInfo.lastInsertRowid
  let successCount = 0
  let duplicateCount = 0
  let errorCount = 0
  const results = []
  const insertRecord = db().prepare(`
    INSERT INTO trap_records (record_no, batch_id, location_id, trap_start_time, trap_end_time,
      insect_count, insect_types, sample_status, quality_score, photo_path, collected_by, conclusion,
      source_import_id, is_duplicate, duplicate_of_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertComment = db().prepare(`
    INSERT INTO review_comments (record_id, reviewer, comment, comment_type)
    VALUES (?, ?, ?, ?)
  `)

  const tx = db().transaction(() => {
    for (const rec of records) {
      try {
        if (!rec.batch_id || !rec.location_id) {
          errorCount++
          results.push({ record_no: rec.record_no, status: 'error', message: '缺少批次或地点信息' })
          continue
        }

        const dup = findDuplicate(rec)
        if (dup) {
          if (import_mode === 'skip') {
            duplicateCount++
            results.push({ record_no: rec.record_no || `${rec.batch_id}-${rec.location_id}`, status: 'duplicate', duplicate_of_id: dup.id, duplicate_of_no: dup.record_no })
            continue
          } else if (import_mode === 'smart') {
            const info = insertRecord.run(
              rec.record_no || (dup.record_no + '_DUP' + dayjs().format('HHmmss')),
              rec.batch_id, rec.location_id, rec.trap_start_time, rec.trap_end_time,
              rec.insect_count || 0, rec.insect_types, rec.sample_status || 'pending',
              rec.quality_score, rec.photo_path, rec.collected_by, rec.conclusion,
              importId, 1, dup.id
            )
            insertComment.run(info.lastInsertRowid, imported_by || 'system', `重复导入标记：与记录 ${dup.record_no} 重复`, 'duplicate')
            duplicateCount++
            results.push({ record_no: rec.record_no, status: 'duplicate_marked', id: info.lastInsertRowid, duplicate_of_id: dup.id })
            continue
          }
        }

        const finalRecordNo = rec.record_no || ('REC' + dayjs().format('YYYYMMDD') + String(successCount + 1).padStart(3, '0'))
        const info = insertRecord.run(
          finalRecordNo, rec.batch_id, rec.location_id, rec.trap_start_time, rec.trap_end_time,
          rec.insect_count || 0, rec.insect_types, rec.sample_status || 'pending',
          rec.quality_score, rec.photo_path, rec.collected_by, rec.conclusion,
          importId, 0, null
        )
        successCount++
        results.push({ record_no: finalRecordNo, status: 'success', id: info.lastInsertRowid })
      } catch (err) {
        errorCount++
        results.push({ record_no: rec.record_no, status: 'error', message: err.message })
      }
    }
  })

  try {
    tx()
  } catch (e) {
    return res.status(500).json({ error: '导入事务失败: ' + e.message })
  }

  db().prepare(`
    UPDATE import_logs SET success_count=?, duplicate_count=?, error_count=? WHERE id=?
  `).run(successCount, duplicateCount, errorCount, importId)

  res.json({
    data: {
      import_id: importId,
      import_batch_no: importBatchNo,
      total: records.length,
      success: successCount,
      duplicate: duplicateCount,
      error: errorCount,
      results
    }
  })
})

router.get('/logs', (req, res) => {
  const rows = db().prepare(`SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 100`).all()
  res.json({ data: rows })
})

router.get('/logs/:id', (req, res) => {
  const log = db().prepare(`SELECT * FROM import_logs WHERE id = ?`).get(req.params.id)
  if (!log) return res.status(404).json({ error: '导入日志不存在' })
  const records = db().prepare(`
    SELECT r.*, b.batch_no, l.code as location_code, l.name as location_name
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    WHERE r.source_import_id = ?
    ORDER BY r.id
  `).all(req.params.id)
  res.json({ data: { ...log, records } })
})

module.exports = router
