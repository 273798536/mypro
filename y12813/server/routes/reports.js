const express = require('express')
const dayjs = require('dayjs')
const router = express.Router()
const db = () => global._db

router.get('/monthly', (req, res) => {
  const { year, month } = req.query
  const y = year || dayjs().year()
  const m = month || (dayjs().month() + 1)
  const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`
  const dateTo = dayjs(dateFrom).endOf('month').format('YYYY-MM-DD')

  const summary = db().prepare(`
    SELECT
      COUNT(DISTINCT r.id) as total_records,
      COUNT(DISTINCT b.id) as total_batches,
      COUNT(DISTINCT r.location_id) as total_locations,
      SUM(CASE WHEN r.sample_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
      SUM(CASE WHEN r.sample_status = 'boundary' THEN 1 ELSE 0 END) as boundary_count,
      SUM(CASE WHEN r.sample_status = 'bad' THEN 1 ELSE 0 END) as bad_count,
      SUM(CASE WHEN r.sample_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(r.insect_count) as total_insect_count,
      AVG(r.quality_score) as avg_quality_score,
      SUM(CASE WHEN r.is_duplicate = 1 THEN 1 ELSE 0 END) as duplicate_count
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    WHERE b.trap_date BETWEEN ? AND ?
  `).get(dateFrom, dateTo)

  const byLocation = db().prepare(`
    SELECT l.id, l.code, l.name, l.area, l.building, l.floor,
      COUNT(r.id) as record_count,
      SUM(CASE WHEN r.sample_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
      SUM(CASE WHEN r.sample_status = 'boundary' THEN 1 ELSE 0 END) as boundary_count,
      SUM(CASE WHEN r.sample_status = 'bad' THEN 1 ELSE 0 END) as bad_count,
      SUM(r.insect_count) as insect_count
    FROM sampling_locations l
    LEFT JOIN trap_records r ON r.location_id = l.id
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    WHERE (b.trap_date BETWEEN ? AND ?) OR b.trap_date IS NULL
    GROUP BY l.id
    ORDER BY l.code
  `).all(dateFrom, dateTo)

  const byBatch = db().prepare(`
    SELECT b.id, b.batch_no, b.trap_date, b.operator, b.has_batch_effect, b.batch_effect_note,
      COUNT(r.id) as record_count,
      SUM(CASE WHEN r.sample_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
      SUM(CASE WHEN r.sample_status = 'boundary' THEN 1 ELSE 0 END) as boundary_count,
      SUM(CASE WHEN r.sample_status = 'bad' THEN 1 ELSE 0 END) as bad_count,
      SUM(r.insect_count) as insect_count
    FROM trap_batches b
    LEFT JOIN trap_records r ON r.batch_id = b.id
    WHERE b.trap_date BETWEEN ? AND ?
    GROUP BY b.id
    ORDER BY b.trap_date
  `).all(dateFrom, dateTo)

  const detailRecords = db().prepare(`
    SELECT r.*, b.batch_no, b.trap_date, b.operator,
           l.code as location_code, l.name as location_name,
           l.area as location_area, l.building as location_building, l.floor as location_floor
    FROM trap_records r
    LEFT JOIN trap_batches b ON b.id = r.batch_id
    LEFT JOIN sampling_locations l ON l.id = r.location_id
    WHERE b.trap_date BETWEEN ? AND ?
    ORDER BY b.trap_date, l.code
  `).all(dateFrom, dateTo)

  res.json({
    data: {
      period: { year: y, month: m, dateFrom, dateTo },
      summary,
      byLocation,
      byBatch,
      records: detailRecords
    }
  })
})

router.get('/export/csv', (req, res) => {
  const { dateFrom, dateTo, type = 'records' } = req.query
  let sql, headers

  if (type === 'records') {
    headers = ['记录编号', '批次号', '诱捕日期', '操作员', '地点编号', '地点名称', '区域', '楼栋', '楼层',
               '诱捕开始', '诱捕结束', '昆虫数量', '昆虫种类', '样本状态', '质量评分', '采样人', '复核人', '结论', '是否重复']
    sql = `
      SELECT r.record_no, b.batch_no, b.trap_date, b.operator, l.code, l.name, l.area, l.building, l.floor,
             r.trap_start_time, r.trap_end_time, r.insect_count, r.insect_types,
             CASE r.sample_status
               WHEN 'normal' THEN '正常'
               WHEN 'boundary' THEN '边界'
               WHEN 'bad' THEN '异常'
               ELSE '待复核'
             END as sample_status_cn,
             r.quality_score, r.collected_by, r.reviewed_by, r.conclusion,
             CASE WHEN r.is_duplicate = 1 THEN '是' ELSE '否' END as is_dup_cn
      FROM trap_records r
      LEFT JOIN trap_batches b ON b.id = r.batch_id
      LEFT JOIN sampling_locations l ON l.id = r.location_id
      WHERE 1=1
    `
    const params = []
    if (dateFrom) { sql += ` AND b.trap_date >= ?`; params.push(dateFrom) }
    if (dateTo) { sql += ` AND b.trap_date <= ?`; params.push(dateTo) }
    sql += ` ORDER BY b.trap_date, l.code`

    const rows = db().prepare(sql).all(...params)
    const csvRows = [headers.join(',')]
    for (const r of rows) {
      csvRows.push([
        r.record_no, r.batch_no, r.trap_date, r.operator, r.code, r.name, r.area, r.building, r.floor,
        r.trap_start_time, r.trap_end_time, r.insect_count, `"${(r.insect_types || '').replace(/"/g, '""')}"`,
        r.sample_status_cn, r.quality_score || '', r.collected_by || '', r.reviewed_by || '',
        `"${(r.conclusion || '').replace(/"/g, '""')}"`, r.is_dup_cn
      ].join(','))
    }
    const csvContent = '\uFEFF' + csvRows.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="insect_trap_records_${dayjs().format('YYYYMMDD')}.csv"`)
    res.send(csvContent)
  }
})

module.exports = router
