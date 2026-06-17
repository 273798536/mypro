const express = require('express');
const cors = require('cors');
const db = require('./db');
const { normalizePayload, logHistory, calculateMetrics, getFieldMapping } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/versions', (req, res) => {
  const rows = db.prepare(`
    SELECT v.*,
      (SELECT COUNT(*) FROM samples s WHERE s.version_id = v.id) as actual_count,
      (SELECT COUNT(*) FROM manual_corrections m WHERE m.version_id = v.id) as correction_count,
      (SELECT COUNT(*) FROM anomaly_queue a WHERE a.version_id = v.id AND a.status = 'open') as open_anomaly_count
    FROM dataset_versions v ORDER BY v.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/versions', (req, res) => {
  const { version_name, description, created_by } = req.body;
  if (!version_name) return res.status(400).json({ error: 'version_name is required' });
  try {
    const stmt = db.prepare('INSERT INTO dataset_versions (version_name, description, created_by) VALUES (?, ?, ?)');
    const info = stmt.run(version_name, description || '', created_by || 'system');
    logHistory('version', String(info.lastInsertRowid), info.lastInsertRowid, 'create', null, null, null, created_by || 'system', `创建版本 ${version_name}`);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/versions/:id/metrics', (req, res) => {
  const id = parseInt(req.params.id);
  const metrics = calculateMetrics(id);
  res.json(metrics);
});

app.get('/api/versions/:id/samples', (req, res) => {
  const id = parseInt(req.params.id);
  const { category, anomaly, correct, page = 1, pageSize = 50 } = req.query;
  let sql = 'SELECT * FROM samples WHERE version_id = ?';
  const params = [id];
  if (category) { sql += ' AND category_gt = ?'; params.push(category); }
  if (anomaly === '1') sql += ' AND anomaly_type IS NOT NULL AND anomaly_type != \'\'';
  if (anomaly === '0') sql += ' AND (anomaly_type IS NULL OR anomaly_type = \'\')';
  if (correct === '1') sql += ' AND is_correct = 1';
  if (correct === '0') sql += ' AND is_correct = 0';
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM samples WHERE version_id = ?').get(id).c;
  res.json({ rows, total });
});

app.get('/api/samples/:sampleId/track', (req, res) => {
  const sampleId = req.params.sampleId;
  const allVersions = db.prepare(`
    SELECT s.*, v.version_name, v.created_at as version_created
    FROM samples s LEFT JOIN dataset_versions v ON s.version_id = v.id
    WHERE s.sample_id = ? ORDER BY v.created_at ASC
  `).all(sampleId);
  const corrections = db.prepare(`
    SELECT m.*, v.version_name
    FROM manual_corrections m LEFT JOIN dataset_versions v ON m.version_id = v.id
    WHERE m.sample_id = ? ORDER BY m.corrected_at DESC
  `).all(sampleId);
  const anomalies = db.prepare(`
    SELECT a.*, v.version_name
    FROM anomaly_queue a LEFT JOIN dataset_versions v ON a.version_id = v.id
    WHERE a.sample_id = ? ORDER BY a.detected_at DESC
  `).all(sampleId);
  const history = db.prepare(`
    SELECT * FROM change_history WHERE entity_type = 'sample' AND entity_id = ? ORDER BY created_at DESC
  `).all(sampleId);
  res.json({ sample_id: sampleId, versions: allVersions, corrections, anomalies, history });
});

app.get('/api/versions/:id/corrections', (req, res) => {
  const id = parseInt(req.params.id);
  const { status, source, page = 1, pageSize = 50 } = req.query;
  let sql = 'SELECT * FROM manual_corrections WHERE version_id = ?';
  const params = [id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (source) { sql += ' AND source = ?'; params.push(source); }
  sql += ' ORDER BY corrected_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM manual_corrections WHERE version_id = ?').get(id).c;
  const statusStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM manual_corrections WHERE version_id = ? GROUP BY status
  `).all(id).reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {});
  const sourceStats = db.prepare(`
    SELECT source, COUNT(*) as count FROM manual_corrections WHERE version_id = ? GROUP BY source
  `).all(id).reduce((acc, r) => ({ ...acc, [r.source]: r.count }), {});
  res.json({ rows, total, statusStats, sourceStats });
});

app.post('/api/versions/:id/corrections', (req, res) => {
  const versionId = parseInt(req.params.id);
  const rawPayload = req.body;
  const normalized = normalizePayload(rawPayload);
  if (!normalized.sample_id) return res.status(400).json({ error: 'sample_id is required' });
  try {
    const stmt = db.prepare(`INSERT INTO manual_corrections
      (sample_id, version_id, source, field_mapping_version, raw_payload,
       category_before, category_after, status, corrected_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(
      normalized.sample_id, versionId,
      normalized.source || 'unknown',
      normalized.field_mapping_version || 'v1',
      JSON.stringify(rawPayload),
      normalized.category_before || normalized.category_gt || null,
      normalized.category_after || normalized.correction_result || null,
      normalized.status || 'pending',
      normalized.corrected_by || normalized.operator || 'scheduler'
    );
    logHistory('correction', String(info.lastInsertRowid), versionId, 'create',
      'status', null, normalized.status, normalized.corrected_by || 'scheduler',
      `排班同事提交修正: source=${normalized.source}`);
    res.json({ id: info.lastInsertRowid, normalized });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/corrections/batch-import', (req, res) => {
  const { version_id, items } = req.body;
  if (!version_id || !Array.isArray(items)) return res.status(400).json({ error: 'invalid payload' });
  const results = [];
  let success = 0, failed = 0;
  const tx = db.transaction(() => {
    items.forEach((raw, idx) => {
      try {
        const normalized = normalizePayload(raw);
        if (!normalized.sample_id) throw new Error(`row ${idx}: missing sample_id`);
        const stmt = db.prepare(`INSERT INTO manual_corrections
          (sample_id, version_id, source, field_mapping_version, raw_payload,
           category_before, category_after, status, corrected_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const info = stmt.run(
          normalized.sample_id, version_id,
          normalized.source || 'unknown', 'v1',
          JSON.stringify(raw),
          normalized.category_before || null,
          normalized.category_after || null,
          normalized.status || 'pending',
          normalized.corrected_by || 'scheduler'
        );
        success++;
        results.push({ idx, id: info.lastInsertRowid, status: 'ok' });
      } catch (e) {
        failed++;
        results.push({ idx, status: 'failed', error: e.message });
      }
    });
  });
  try {
    tx();
    logHistory('correction', 'batch', version_id, 'batch_import', 'count', null, String(success), 'scheduler', `批量导入: 成功${success}条, 失败${failed}条`);
    res.json({ success, failed, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/corrections/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM manual_corrections WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { status, review_note, reviewed_by, category_after, category_before } = req.body;
  const fields = [];
  const params = [];
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (review_note !== undefined) { fields.push('review_note = ?'); params.push(review_note); }
  if (reviewed_by !== undefined) { fields.push('reviewed_by = ?'); params.push(reviewed_by); }
  if (category_after !== undefined) { fields.push('category_after = ?'); params.push(category_after); }
  if (category_before !== undefined) { fields.push('category_before = ?'); params.push(category_before); }
  if (status === 'confirmed') { fields.push('reviewed_at = ?'); params.push(new Date().toISOString()); }
  params.push(id);
  const stmt = db.prepare(`UPDATE manual_corrections SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  if (status && status !== existing.status) {
    logHistory('correction', String(id), existing.version_id, 'update',
      'status', existing.status, status, reviewed_by || 'reviewer', review_note || '');
  }
  if (category_after !== undefined && category_after !== existing.category_after) {
    logHistory('correction', String(id), existing.version_id, 'update',
      'category_after', existing.category_after, category_after, reviewed_by || 'reviewer', '人工确认变更修正结果');
  }
  if (status === 'confirmed' && category_after && existing.sample_id) {
    const sample = db.prepare('SELECT * FROM samples WHERE sample_id = ? AND version_id = ?').get(existing.sample_id, existing.version_id);
    if (sample) {
      const oldCategory = sample.category_gt;
      const oldCorrect = sample.is_correct;
      const newCorrect = (sample.category_pred === category_after) ? 1 : 0;
      db.prepare('UPDATE samples SET category_gt = ?, is_correct = ? WHERE id = ?').run(category_after, newCorrect, sample.id);
      logHistory('sample', existing.sample_id, existing.version_id, 'update',
        'category_gt', oldCategory, category_after, reviewed_by || 'reviewer',
        `人工确认: 类别变更，is_correct从${oldCorrect}变为${newCorrect}`);
    }
  }
  res.json({ ok: true });
});

app.get('/api/versions/:id/anomalies', (req, res) => {
  const id = parseInt(req.params.id);
  const { status, anomaly_type } = req.query;
  let sql = 'SELECT * FROM anomaly_queue WHERE version_id = ?';
  const params = [id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (anomaly_type) { sql += ' AND anomaly_type = ?'; params.push(anomaly_type); }
  sql += ' ORDER BY detected_at DESC';
  const rows = db.prepare(sql).all(...params);
  const typeStats = db.prepare(`
    SELECT anomaly_type, status, COUNT(*) as count FROM anomaly_queue WHERE version_id = ? GROUP BY anomaly_type, status
  `).all(id);
  res.json({ rows, typeStats });
});

app.post('/api/versions/:id/anomalies', (req, res) => {
  const versionId = parseInt(req.params.id);
  const { sample_id, anomaly_type, severity, description } = req.body;
  if (!sample_id || !anomaly_type) return res.status(400).json({ error: 'sample_id and anomaly_type required' });
  const stmt = db.prepare(`INSERT INTO anomaly_queue
    (sample_id, version_id, anomaly_type, severity, description, status)
    VALUES (?, ?, ?, ?, ?, 'open')`);
  const info = stmt.run(sample_id, versionId, anomaly_type, severity || 'normal', description || '');
  const sample = db.prepare('SELECT * FROM samples WHERE sample_id = ? AND version_id = ?').get(sample_id, versionId);
  if (sample) {
    const old = sample.anomaly_type || '';
    db.prepare('UPDATE samples SET anomaly_type = ?, anomaly_tag = ? WHERE id = ?').run(
      anomaly_type, anomaly_type, sample.id
    );
    logHistory('sample', sample_id, versionId, 'update',
      'anomaly_type', old, anomaly_type, 'system', `检测异常: ${anomaly_type}`);
  }
  logHistory('anomaly', String(info.lastInsertRowid), versionId, 'create',
    'anomaly_type', null, anomaly_type, 'system', description || '');
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/anomalies/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM anomaly_queue WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { status, resolution_note, resolved_by } = req.body;
  if (status === 'resolved') {
    db.prepare(`UPDATE anomaly_queue SET status = 'resolved', resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?`)
      .run(new Date().toISOString(), resolved_by || 'reviewer', resolution_note || '', id);
  } else if (status) {
    db.prepare('UPDATE anomaly_queue SET status = ?, resolution_note = ? WHERE id = ?')
      .run(status, resolution_note || '', id);
  }
  if (status && status !== existing.status) {
    logHistory('anomaly', String(id), existing.version_id, 'update',
      'status', existing.status, status, resolved_by || 'reviewer', resolution_note || '');
  }
  res.json({ ok: true });
});

app.post('/api/versions/:id/samples/batch', (req, res) => {
  const versionId = parseInt(req.params.id);
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  let success = 0, failed = 0;
  const tx = db.transaction(() => {
    items.forEach(it => {
      try {
        if (!it.sample_id) throw new Error('missing sample_id');
        const isCorrect = (it.category_gt && it.category_pred && it.category_gt === it.category_pred) ? 1 : 0;
        const stmt = db.prepare(`INSERT OR REPLACE INTO samples
          (sample_id, version_id, image_path, category_gt, category_pred, confidence, is_correct, anomaly_type, anomaly_tag, extra_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
          it.sample_id, versionId,
          it.image_path || null,
          it.category_gt || null,
          it.category_pred || null,
          it.confidence || 0,
          it.is_correct !== undefined ? it.is_correct : isCorrect,
          it.anomaly_type || null,
          it.anomaly_tag || it.anomaly_type || null,
          it.extra_data ? JSON.stringify(it.extra_data) : null
        );
        success++;
      } catch (e) {
        failed++;
      }
    });
    db.prepare('UPDATE dataset_versions SET sample_count = ? WHERE id = ?').run(success, versionId);
  });
  try {
    tx();
    logHistory('version', String(versionId), versionId, 'import_samples',
      'sample_count', null, String(success), 'system', `批量导入样本: ${success}条`);
    res.json({ success, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/history', (req, res) => {
  const { entity_type, entity_id, version_id, page = 1, pageSize = 100 } = req.query;
  let sql = 'SELECT * FROM change_history WHERE 1=1';
  const params = [];
  if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
  if (entity_id) { sql += ' AND entity_id = ?'; params.push(entity_id); }
  if (version_id) { sql += ' AND version_id = ?'; params.push(parseInt(version_id)); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/versions/compare', (req, res) => {
  const v1 = parseInt(req.query.v1);
  const v2 = parseInt(req.query.v2);
  if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 required' });
  const m1 = calculateMetrics(v1);
  const m2 = calculateMetrics(v2);
  const sampleIds1 = new Set(db.prepare('SELECT sample_id FROM samples WHERE version_id = ?').all(v1).map(r => r.sample_id));
  const sampleIds2 = new Set(db.prepare('SELECT sample_id FROM samples WHERE version_id = ?').all(v2).map(r => r.sample_id));
  const added = [...sampleIds2].filter(s => !sampleIds1.has(s));
  const removed = [...sampleIds1].filter(s => !sampleIds2.has(s));
  const common = [...sampleIds1].filter(s => sampleIds2.has(s));
  const changedCategories = [];
  const commonSamples = db.prepare(`
    SELECT s1.sample_id, s1.category_gt as cat1, s2.category_gt as cat2,
           s1.is_correct as c1, s2.is_correct as c2
    FROM samples s1 JOIN samples s2 ON s1.sample_id = s2.sample_id
    WHERE s1.version_id = ? AND s2.version_id = ? AND (s1.category_gt != s2.category_gt OR s1.is_correct != s2.is_correct)
  `).all(v1, v2);
  res.json({
    v1_metrics: m1, v2_metrics: m2,
    sample_set: {
      v1_count: sampleIds1.size, v2_count: sampleIds2.size,
      added_count: added.length, removed_count: removed.length, common_count: common.length,
      added_samples: added, removed_samples: removed
    },
    category_changes: commonSamples,
    accuracy_diff: Number((m2.accuracy - m1.accuracy).toFixed(2))
  });
});

app.get('/api/field-mapping', (req, res) => {
  const rows = db.prepare('SELECT * FROM field_mapping ORDER BY standard_field').all();
  res.json(rows);
});

app.post('/api/field-mapping', (req, res) => {
  const { source_name, standard_field, mapping_note } = req.body;
  if (!source_name || !standard_field) return res.status(400).json({ error: 'required' });
  try {
    const stmt = db.prepare(`INSERT OR REPLACE INTO field_mapping (source_name, standard_field, mapping_note) VALUES (?, ?, ?)`);
    stmt.run(source_name, standard_field, mapping_note || '');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/review/impact/:versionId', (req, res) => {
  const vid = parseInt(req.params.versionId);
  const metrics = calculateMetrics(vid);
  const highConfWrong = db.prepare(`
    SELECT * FROM samples WHERE version_id = ? AND is_correct = 0
    AND (anomaly_type IS NULL OR anomaly_type = '')
    ORDER BY confidence DESC LIMIT 50
  `).all(vid);
  const perCategoryWorst = db.prepare(`
    SELECT category_gt, COUNT(*) as total, SUM(CASE WHEN is_correct=0 THEN 1 ELSE 0 END) as wrong_count,
      ROUND(SUM(CASE WHEN is_correct=0 THEN 1 ELSE 0 END)*100.0/COUNT(*),2) as wrong_rate
    FROM samples WHERE version_id = ? AND (anomaly_type IS NULL OR anomaly_type = '')
    GROUP BY category_gt HAVING wrong_count > 0 ORDER BY wrong_rate DESC
  `).all(vid);
  const correctionsConfirmed = db.prepare(`
    SELECT m.*, s.category_pred, s.confidence
    FROM manual_corrections m LEFT JOIN samples s ON m.sample_id=s.sample_id AND m.version_id=s.version_id
    WHERE m.version_id = ? AND m.status = 'confirmed'
    ORDER BY m.reviewed_at DESC
  `).all(vid);
  res.json({
    metrics,
    high_conf_wrong: highConfWrong,
    per_category_worst: perCategoryWorst,
    confirmed_corrections: correctionsConfirmed
  });
});

app.listen(PORT, () => {
  console.log(`[工业视觉指标看板] 后端服务启动: http://localhost:${PORT}`);
});

module.exports = app;
