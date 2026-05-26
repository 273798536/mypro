const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const anomalyDetector = require('../services/anomalyDetector');

router.get('/orders', (req, res) => {
  const db = getDb();
  const { merchant_id, settle_date, order_no, limit, offset } = req.query;

  let sql = 'SELECT * FROM merchant_orders WHERE 1=1';
  const params = [];

  if (merchant_id) { sql += ' AND merchant_id = ?'; params.push(merchant_id); }
  if (settle_date) { sql += ' AND settle_date = ?'; params.push(settle_date); }
  if (order_no) { sql += ' AND order_no = ?'; params.push(order_no); }

  sql += ' ORDER BY settle_date DESC';

  const l = parseInt(limit) || 50;
  const o = parseInt(offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(l, o);

  const rows = db.prepare(sql).all(...params);
  res.json({ total: rows.length, limit: l, offset: o, data: rows });
});

router.get('/refunds', (req, res) => {
  const db = getDb();
  const { merchant_id, order_no, refund_no, settle_date, limit, offset } = req.query;

  let sql = 'SELECT * FROM refund_records WHERE 1=1';
  const params = [];

  if (merchant_id) { sql += ' AND merchant_id = ?'; params.push(merchant_id); }
  if (order_no) { sql += ' AND order_no = ?'; params.push(order_no); }
  if (refund_no) { sql += ' AND refund_no = ?'; params.push(refund_no); }
  if (settle_date) { sql += ' AND settle_date = ?'; params.push(settle_date); }

  sql += ' ORDER BY refund_date DESC';

  const l = parseInt(limit) || 50;
  const o = parseInt(offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(l, o);

  const rows = db.prepare(sql).all(...params);
  res.json({ total: rows.length, limit: l, offset: o, data: rows });
});

router.get('/rules', (req, res) => {
  const db = getDb();
  const { merchant_id, rule_version, status } = req.query;

  let sql = 'SELECT * FROM split_rules WHERE 1=1';
  const params = [];

  if (merchant_id) { sql += ' AND merchant_id = ?'; params.push(merchant_id); }
  if (rule_version) { sql += ' AND rule_version = ?'; params.push(rule_version); }
  if (status) { sql += ' AND status = ?'; params.push(status); }

  sql += ' ORDER BY effective_from DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows });
});

router.get('/subsidies', (req, res) => {
  const db = getDb();
  const { merchant_id, subsidy_batch_no, order_no, is_reversed, limit, offset } = req.query;

  let sql = 'SELECT * FROM platform_subsidies WHERE 1=1';
  const params = [];

  if (merchant_id) { sql += ' AND merchant_id = ?'; params.push(merchant_id); }
  if (subsidy_batch_no) { sql += ' AND subsidy_batch_no = ?'; params.push(subsidy_batch_no); }
  if (order_no) { sql += ' AND order_no = ?'; params.push(order_no); }
  if (is_reversed !== undefined) { sql += ' AND is_reversed = ?'; params.push(is_reversed === 'true' ? 1 : 0); }

  sql += ' ORDER BY settle_date DESC';

  const l = parseInt(limit) || 50;
  const o = parseInt(offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(l, o);

  const rows = db.prepare(sql).all(...params);
  res.json({ total: rows.length, limit: l, offset: o, data: rows });
});

router.get('/settlements', (req, res) => {
  const db = getDb();
  const { merchant_id, settle_date, is_final } = req.query;

  let sql = 'SELECT * FROM settlement_reports WHERE 1=1';
  const params = [];

  if (merchant_id) { sql += ' AND merchant_id = ?'; params.push(merchant_id); }
  if (settle_date) { sql += ' AND settle_date = ?'; params.push(settle_date); }
  if (is_final !== undefined) { sql += ' AND is_final = ?'; params.push(is_final === 'true' ? 1 : 0); }

  sql += ' ORDER BY settle_date DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows });
});

router.get('/anomalies', (req, res) => {
  const { case_no, type, severity, resolved } = req.query;

  let anomalies = anomalyDetector.getAnomalies(case_no || null);

  if (type) anomalies = anomalies.filter(a => a.anomaly_type === type);
  if (severity) anomalies = anomalies.filter(a => a.severity === severity);
  if (resolved !== undefined) anomalies = anomalies.filter(a => a.resolved === (resolved === 'true' ? 1 : 0));

  res.json({ data: anomalies });
});

router.post('/anomalies/detect', (req, res) => {
  const { case_no, global } = req.body;
  try {
    if (global) {
      const all = anomalyDetector.detectAll();
      res.json({ detected: all.length, anomalies: all });
    } else if (case_no) {
      const anomalies = anomalyDetector.detectForCase(case_no);
      anomalyDetector.saveAnomalies(case_no, anomalies);
      res.json({ case_no, detected: anomalies.length, anomalies });
    } else {
      res.status(400).json({ error: '需指定 case_no 或设置 global=true' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/anomalies/:id/resolve', (req, res) => {
  try {
    const result = anomalyDetector.markResolved(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
