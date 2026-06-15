const express = require('express');
const db = require('../db');
const { normalizeLocation } = require('./locations');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, location_id, is_duplicate, complaint_type, page = 1, page_size = 20 } = req.query;
  
  let countSql = 'SELECT COUNT(*) as total FROM complaints WHERE 1=1';
  let dataSql = `
    SELECT c.*, 
           l.standard_name, l.latitude, l.longitude, l.district, l.school_name,
           u.name as creator_name,
           (SELECT COUNT(*) FROM photos WHERE complaint_id = c.id) as photo_count,
           (SELECT COUNT(*) FROM notes WHERE complaint_id = c.id AND is_latest = 1) as note_count,
           CASE WHEN c.is_duplicate = 1 THEN (SELECT complaint_no FROM complaints WHERE id = c.duplicate_of) END as duplicate_of_no
    FROM complaints c
    LEFT JOIN locations l ON c.location_id = l.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE 1=1
  `;
  
  const params = [];
  const where = [];
  
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  }
  if (location_id) {
    where.push('c.location_id = ?');
    params.push(location_id);
  }
  if (is_duplicate !== undefined) {
    where.push('c.is_duplicate = ?');
    params.push(is_duplicate === 'true' ? 1 : 0);
  }
  if (complaint_type) {
    where.push('c.complaint_type = ?');
    params.push(complaint_type);
  }
  
  const whereClause = where.length > 0 ? ' AND ' + where.join(' AND ') : '';
  countSql += whereClause;
  dataSql += whereClause + ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  
  const { total } = db.prepare(countSql).get(...params);
  const offset = (parseInt(page) - 1) * parseInt(page_size);
  const complaints = db.prepare(dataSql).all(...params, parseInt(page_size), offset);
  
  res.json({
    list: complaints,
    pagination: {
      page: parseInt(page),
      page_size: parseInt(page_size),
      total,
      total_pages: Math.ceil(total / parseInt(page_size))
    }
  });
});

router.get('/:id', (req, res) => {
  const complaint = db.prepare(`
    SELECT c.*,
           l.standard_name, l.latitude, l.longitude, l.district, l.school_name,
           cr.name as rule_name, cr.version as rule_version, cr.rules_json as rule_content,
           CASE WHEN c.is_duplicate = 1 THEN 
             (SELECT complaint_no || '|' || description FROM complaints WHERE id = c.duplicate_of) 
           END as duplicate_info
    FROM complaints c
    LEFT JOIN locations l ON c.location_id = l.id
    LEFT JOIN calculation_rules cr ON c.calculation_rule_id = cr.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: '投诉不存在' });
  }

  if (complaint.rule_content) {
    complaint.rule_content = JSON.parse(complaint.rule_content);
  }

  if (complaint.duplicate_info) {
    const [no, desc] = complaint.duplicate_info.split('|');
    complaint.duplicate_of_complaint = { complaint_no: no, description: desc };
    delete complaint.duplicate_info;
  }

  const normalized = normalizeLocation(complaint.original_location_text);
  complaint.location_normalization = normalized;

  const locationAliases = db.prepare(`
    SELECT alias_name, source FROM location_aliases WHERE location_id = ?
  `).all(complaint.location_id);
  complaint.location_aliases = locationAliases;

  const photos = db.prepare(`
    SELECT p.*, u.name as uploader_name,
           (SELECT file_name FROM photos WHERE id = p.parent_photo_id) as parent_photo_name
    FROM photos p
    LEFT JOIN users u ON p.uploaded_by = u.id
    WHERE p.complaint_id = ?
    ORDER BY p.version, p.uploaded_at
  `).all(req.params.id);

  photos.forEach(p => {
    p.notes = db.prepare(`
      SELECT n.*, u.name as creator_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.photo_id = ?
      ORDER BY n.version
    `).all(p.id);
  });

  complaint.photos = photos;

  const notes = db.prepare(`
    SELECT n.*, u.name as creator_name
    FROM notes n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.complaint_id = ? AND n.photo_id IS NULL
    ORDER BY n.version
  `).all(req.params.id);
  complaint.notes = notes;

  const versionHistory = db.prepare(`
    SELECT vh.*, u.name as changer_name
    FROM version_history vh
    LEFT JOIN users u ON vh.changed_by = u.id
    WHERE vh.complaint_id = ?
    ORDER BY vh.changed_at DESC
  `).all(req.params.id);
  complaint.version_history = versionHistory;

  const supplementRecords = db.prepare(`
    SELECT sr.*, p.file_name, u.name as supplementer_name
    FROM supplement_records sr
    LEFT JOIN photos p ON sr.photo_id = p.id
    LEFT JOIN users u ON sr.supplemented_by = u.id
    WHERE sr.complaint_id = ?
    ORDER BY sr.supplemented_at DESC
  `).all(req.params.id);

  supplementRecords.forEach(s => {
    s.changes = JSON.parse(s.changes_json);
    delete s.changes_json;
  });
  complaint.supplement_records = supplementRecords;

  const reviewRecords = db.prepare(`
    SELECT rr.*, u.name as reviewer_name
    FROM review_records rr
    LEFT JOIN users u ON rr.reviewed_by = u.id
    WHERE rr.complaint_id = ?
    ORDER BY rr.reviewed_at DESC
  `).all(req.params.id);

  reviewRecords.forEach(r => {
    if (r.calculation_snapshot) {
      r.calculation_snapshot = JSON.parse(r.calculation_snapshot);
    }
  });
  complaint.review_records = reviewRecords;

  res.json(complaint);
});

router.post('/', (req, res) => {
  const {
    complaint_no, original_location_text, complaint_type, description,
    reported_at, reported_by, calculation_rule_id
  } = req.body;

  const normalized = normalizeLocation(original_location_text);
  const location_id = normalized.matched ? normalized.location_id : null;

  const result = db.prepare(`
    INSERT INTO complaints (
      complaint_no, original_location_text, location_id, complaint_type,
      description, status, calculation_rule_id, reported_at, reported_by
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    complaint_no, original_location_text, location_id, complaint_type,
    description, calculation_rule_id, reported_at, reported_by
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    complaint_no,
    location_normalized: normalized
  });
});

function recordVersionChange(complaintId, fieldName, oldValue, newValue, changedBy, reason) {
  if (oldValue === newValue) return;
  
  db.prepare(`
    INSERT INTO version_history (complaint_id, field_name, old_value, new_value, changed_by, change_reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    complaintId, fieldName,
    oldValue !== undefined ? String(oldValue) : null,
    newValue !== undefined ? String(newValue) : null,
    changedBy, reason
  );
}

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    status, description, location_id, is_duplicate, duplicate_of,
    change_reason, changed_by = 1
  } = req.body;

  const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '投诉不存在' });
  }

  const updates = [];
  const params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    recordVersionChange(id, 'status', existing.status, status, changed_by, change_reason || '状态更新');
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
    recordVersionChange(id, 'description', existing.description, description, changed_by, change_reason || '描述更新');
  }
  if (location_id !== undefined) {
    updates.push('location_id = ?');
    params.push(location_id);
    recordVersionChange(id, 'location_id', existing.location_id, location_id, changed_by, change_reason || '地点更新');
  }
  if (is_duplicate !== undefined) {
    updates.push('is_duplicate = ?');
    params.push(is_duplicate ? 1 : 0);
    recordVersionChange(id, 'is_duplicate', existing.is_duplicate, is_duplicate, changed_by, change_reason || '重复标记更新');
  }
  if (duplicate_of !== undefined) {
    updates.push('duplicate_of = ?');
    params.push(duplicate_of);
    recordVersionChange(id, 'duplicate_of', existing.duplicate_of, duplicate_of, changed_by, change_reason || '关联主投诉更新');
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有需要更新的字段' });
  }

  params.push(id);
  db.prepare(`UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ success: true });
});

router.post('/:id/notes', (req, res) => {
  const { id } = req.params;
  const { photo_id, content, created_by = 1 } = req.body;

  const existing = db.prepare(`
    SELECT MAX(version) as max_version FROM notes WHERE complaint_id = ? AND photo_id IS ?
  `).get(id, photo_id || null);

  const newVersion = (existing?.max_version || 0) + 1;

  db.prepare(`
    UPDATE notes SET is_latest = 0 WHERE complaint_id = ? AND photo_id IS ?
  `).run(id, photo_id || null);

  const result = db.prepare(`
    INSERT INTO notes (complaint_id, photo_id, content, created_by, version, is_latest)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, photo_id || null, content, created_by, newVersion);

  res.status(201).json({ id: result.lastInsertRowid, version: newVersion });
});

router.post('/:id/review', (req, res) => {
  const { id } = req.params;
  const { result, comment, reviewed_by = 1, calculation_snapshot } = req.body;

  const dbResult = db.prepare(`
    INSERT INTO review_records (complaint_id, reviewed_by, result, comment, calculation_snapshot)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id, reviewed_by, result, comment,
    calculation_snapshot ? JSON.stringify(calculation_snapshot) : null
  );

  if (result === 'pass') {
    db.prepare("UPDATE complaints SET status = 'resolved' WHERE id = ?").run(id);
    recordVersionChange(id, 'status', null, 'resolved', reviewed_by, '复核通过');
  } else if (result === 'fail') {
    db.prepare("UPDATE complaints SET status = 'rejected' WHERE id = ?").run(id);
    recordVersionChange(id, 'status', null, 'rejected', reviewed_by, '复核不通过');
  } else if (result === 'duplicate') {
    db.prepare("UPDATE complaints SET status = 'duplicate', is_duplicate = 1 WHERE id = ?").run(id);
    recordVersionChange(id, 'status', null, 'duplicate', reviewed_by, '判定为重复投诉');
  }

  res.json({ id: dbResult.lastInsertRowid, success: true });
});

router.post('/:id/rerun', (req, res) => {
  const { id } = req.params;
  const { rule_id, run_by = 1 } = req.body;

  const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
  if (!complaint) {
    return res.status(404).json({ error: '投诉不存在' });
  }

  const rule = db.prepare('SELECT * FROM calculation_rules WHERE id = ?').get(rule_id || complaint.calculation_rule_id);
  if (!rule) {
    return res.status(400).json({ error: '计算规则不存在' });
  }

  const ruleContent = JSON.parse(rule.rules_json);
  
  const peakHourMatch = ruleContent.peakHours.some(h => {
    const [start, end] = h.split('-');
    const complaintHour = new Date(complaint.reported_at).getHours();
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    return complaintHour >= startHour && complaintHour < endHour;
  });

  const factorsMatched = ruleContent.factors.filter(f => 
    complaint.complaint_type.includes(f.replace(/([A-Z])/g, '_$1').toLowerCase()) ||
    complaint.description.includes(f)
  );

  const severityScore = Math.min(10, factorsMatched.length * 3 + (peakHourMatch ? 2 : 0));

  const snapshot = {
    ruleVersion: rule.version,
    peakHourMatch,
    factorsMatched,
    severityScore,
    runAt: new Date().toISOString(),
    runBy: run_by,
    recommendation: severityScore >= 7 ? '需人工复核' : severityScore >= 4 ? '建议关注' : '可自动处理'
  };

  recordVersionChange(
    id, 'calculation_result',
    `重新计算-${rule.version}`,
    JSON.stringify(snapshot),
    run_by,
    '重新运行计算口径'
  );

  res.json({
    success: true,
    rule_name: rule.name,
    rule_version: rule.version,
    result: snapshot
  });
});

module.exports = router;
