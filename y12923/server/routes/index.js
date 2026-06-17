const express = require('express');
const { getDb } = require('../db');
const { 
  importBatch, 
  runRegressionForBatch, 
  correctSample, 
  getSampleCorrectionHistory,
  getBatchSummary,
  detectSensitiveWords
} = require('../services');
const Papa = require('papaparse');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/rules', (req, res) => {
  const db = getDb();
  const rules = db.prepare('SELECT * FROM sensitive_rules ORDER BY created_at DESC').all();
  res.json(rules);
});

router.post('/rules', (req, res) => {
  const db = getDb();
  const { rule_name, rule_pattern, rule_type, description } = req.body;
  const result = db.prepare(`
    INSERT INTO sensitive_rules (rule_name, rule_pattern, rule_type, description)
    VALUES (?, ?, ?, ?)
  `).run(rule_name, rule_pattern, rule_type, description || '');
  res.json({ id: result.lastInsertRowid, rule_name, rule_pattern, rule_type });
});

router.put('/rules/:id', (req, res) => {
  const db = getDb();
  const { rule_name, rule_pattern, rule_type, description, is_active } = req.body;
  db.prepare(`
    UPDATE sensitive_rules 
    SET rule_name = ?, rule_pattern = ?, rule_type = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(rule_name, rule_pattern, rule_type, description || '', is_active, req.params.id);
  res.json({ success: true });
});

router.delete('/rules/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sensitive_rules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/batches', (req, res) => {
  const db = getDb();
  const batches = db.prepare(`
    SELECT b.*, COUNT(s.id) as sample_count
    FROM sample_batches b
    LEFT JOIN test_samples s ON b.batch_id = s.batch_id
    GROUP BY b.id
    ORDER BY b.imported_at DESC
  `).all();
  res.json(batches);
});

router.get('/batches/:batchId/samples', (req, res) => {
  const db = getDb();
  const { sample_type, final_result } = req.query;
  let sql = 'SELECT * FROM test_samples WHERE batch_id = ?';
  const params = [req.params.batchId];
  
  if (sample_type) {
    sql += ' AND sample_type = ?';
    params.push(sample_type);
  }
  if (final_result) {
    sql += ' AND final_result = ?';
    params.push(final_result);
  }
  
  sql += ' ORDER BY created_at DESC';
  const samples = db.prepare(sql).all(...params);
  
  const result = samples.map(s => ({
    ...s,
    is_confirmed: s.is_confirmed === 1,
    auto_hit_rules: s.auto_hit_rules ? JSON.parse(s.auto_hit_rules) : []
  }));
  
  res.json(result);
});

router.get('/batches/:batchId/summary', (req, res) => {
  const summary = getBatchSummary(req.params.batchId);
  res.json(summary);
});

router.post('/batches/import', upload.single('file'), (req, res) => {
  try {
    const batchId = req.body.batch_id || uuidv4();
    const batchName = req.body.batch_name || `导入批次 ${new Date().toLocaleString()}`;
    const description = req.body.description || '';
    const source = req.body.source || 'manual';

    let samples = [];
    if (req.file) {
      const csvContent = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      samples = parsed.data.map(row => ({
        sample_id: row.sample_id || null,
        content: row.content,
        sample_type: row.sample_type,
        expected_result: row.expected_result,
        note: row.note || ''
      }));
    } else if (req.body.samples) {
      samples = JSON.parse(req.body.samples);
    }

    if (!samples || samples.length === 0) {
      return res.status(400).json({ error: '没有可导入的样本数据' });
    }

    const stats = importBatch({
      batch_id: batchId,
      batch_name: batchName,
      description,
      source,
      samples
    });

    res.json({
      success: true,
      batch_id: batchId,
      stats
    });
  } catch (error) {
    console.error('导入失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batches/:batchId/regression', (req, res) => {
  try {
    const count = runRegressionForBatch(req.params.batchId);
    res.json({ success: true, processed: count });
  } catch (error) {
    console.error('回归测试失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/samples/:sampleId/correct', (req, res) => {
  try {
    const { new_result, reason, operator } = req.body;
    if (!new_result || !reason) {
      return res.status(400).json({ error: '修正结果和原因必填' });
    }
    const history = correctSample(req.params.sampleId, new_result, reason, operator || 'manual');
    res.json({ success: true, history });
  } catch (error) {
    console.error('修正失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/samples/:sampleId/history', (req, res) => {
  const history = getSampleCorrectionHistory(req.params.sampleId);
  res.json(history);
});

router.get('/batches/:batchId/export', (req, res) => {
  const summary = getBatchSummary(req.params.batchId);
  
  const exportData = summary.details.map(d => ({
    sample_id: d.sample_id,
    sample_type: d.sample_type === 'normal' ? '正常样本' : d.sample_type === 'boundary' ? '边界样本' : '明显坏样本',
    content: d.content,
    expected_result: d.expected_result === 'block' ? '应拦截' : '应通过',
    auto_result: d.auto_result === 'block' ? '自动拦截' : '自动通过',
    final_result: d.final_result === 'block' ? '拦截' : d.final_result === 'pass' ? '通过' : '待确认',
    is_confirmed: d.is_confirmed ? '已确认' : '未确认',
    hit_rules: d.hit_rules.map(r => r.rule_name).join('; '),
    note: d.note
  }));

  const csv = Papa.unparse(exportData);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="regression-${req.params.batchId}.csv"`);
  res.send('\uFEFF' + csv);
});

router.post('/detect', (req, res) => {
  const db = getDb();
  const { content } = req.body;
  const rules = db.prepare('SELECT * FROM sensitive_rules WHERE is_active = 1').all();
  const hits = detectSensitiveWords(content, rules);
  res.json({
    content,
    has_sensitive: hits.length > 0,
    hit_rules: hits
  });
});

module.exports = router;
