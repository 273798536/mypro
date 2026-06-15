const express = require('express');
const db = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/complaints', (req, res) => {
  const { status, format = 'json' } = req.query;

  let sql = `
    SELECT c.*,
           l.standard_name, l.latitude, l.longitude, l.district, l.school_name,
           GROUP_CONCAT(DISTINCT la.alias_name) as location_aliases,
           COUNT(DISTINCT p.id) as photo_count,
           COUNT(DISTINCT n.id) as note_count,
           CASE WHEN c.is_duplicate = 1 THEN (SELECT complaint_no FROM complaints WHERE id = c.duplicate_of) END as duplicate_of_no
    FROM complaints c
    LEFT JOIN locations l ON c.location_id = l.id
    LEFT JOIN location_aliases la ON l.id = la.location_id
    LEFT JOIN photos p ON c.id = p.complaint_id
    LEFT JOIN notes n ON c.id = n.complaint_id
  `;

  const params = [];
  if (status) {
    sql += ' WHERE c.status = ?';
    params.push(status);
  }
  sql += ' GROUP BY c.id ORDER BY c.created_at DESC';

  const complaints = db.prepare(sql).all(...params);

  complaints.forEach(c => {
    c.location_aliases = c.location_aliases ? c.location_aliases.split(',') : [];
    c.photos = db.prepare(`
      SELECT file_name, file_path, is_inspection, is_supplement, supplement_note, version, uploaded_at
      FROM photos WHERE complaint_id = ?
    `).all(c.id);
    
    c.notes = db.prepare(`
      SELECT content, version, created_at
      FROM notes WHERE complaint_id = ? AND is_latest = 1
    `).all(c.id);

    c.version_history = db.prepare(`
      SELECT field_name, old_value, new_value, changed_by, changed_at, change_reason
      FROM version_history WHERE complaint_id = ?
      ORDER BY changed_at DESC
    `).all(c.id);

    c.review_records = db.prepare(`
      SELECT result, comment, reviewed_at
      FROM review_records WHERE complaint_id = ?
      ORDER BY reviewed_at DESC
    `).all(c.id);
  });

  if (format === 'csv') {
    const headers = ['投诉编号', '原始地点', '标准地点', '地点别名', '投诉类型', '状态', '是否重复', '重复关联',
                     '描述', '照片数量', '备注数量', '上报时间', '上报人', '创建时间'];
    
    const rows = complaints.map(c => [
      c.complaint_no,
      c.original_location_text,
      c.standard_name || '',
      c.location_aliases.join(';'),
      c.complaint_type,
      getStatusText(c.status),
      c.is_duplicate ? '是' : '否',
      c.duplicate_of_no || '',
      c.description,
      c.photo_count,
      c.note_count,
      c.reported_at,
      c.reported_by,
      c.created_at
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="投诉记录_${dayjs().format('YYYYMMDD')}.csv"`);
    res.send('\uFEFF' + csv);
  } else {
    res.json({
      export_time: new Date().toISOString(),
      count: complaints.length,
      data: complaints
    });
  }
});

function getStatusText(status) {
  const map = {
    'pending': '待复核',
    'reviewing': '复核中',
    'resolved': '已解决',
    'rejected': '已驳回',
    'duplicate': '重复投诉'
  };
  return map[status] || status;
}

router.get('/summary', (req, res) => {
  const { start_date, end_date } = req.query;

  let where = '';
  const params = [];
  if (start_date && end_date) {
    where = 'WHERE created_at BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  const statusStats = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM complaints ${where}
    GROUP BY status
  `).all(...params);

  const typeStats = db.prepare(`
    SELECT complaint_type, COUNT(*) as count
    FROM complaints ${where}
    GROUP BY complaint_type
  `).all(...params);

  const duplicateStats = db.prepare(`
    SELECT is_duplicate, COUNT(*) as count
    FROM complaints ${where}
    GROUP BY is_duplicate
  `).all(...params);

  const locationStats = db.prepare(`
    SELECT l.standard_name, l.district, COUNT(c.id) as count
    FROM locations l
    LEFT JOIN complaints c ON l.id = c.location_id
    ${where ? 'AND ' + where.replace('WHERE', '') : ''}
    GROUP BY l.id
    ORDER BY count DESC
    LIMIT 10
  `).all(...params);

  res.json({
    period: { start_date, end_date },
    status_stats: statusStats.map(s => ({ status: getStatusText(s.status), count: s.count })),
    type_stats: typeStats.map(t => ({ type: getTypeText(t.complaint_type), count: t.count })),
    duplicate_stats: {
      normal: duplicateStats.find(d => d.is_duplicate === 0)?.count || 0,
      duplicate: duplicateStats.find(d => d.is_duplicate === 1)?.count || 0
    },
    hotspots: locationStats
  });
});

function getTypeText(type) {
  const map = {
    'illegal_parking': '违停',
    'traffic_congestion': '拥堵',
    'pedestrian_safety': '行人安全',
    'noise': '噪音',
    'other': '其他'
  };
  return map[type] || type;
}

module.exports = router;
