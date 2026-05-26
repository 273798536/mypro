const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const stateMachine = require('../services/stateMachine');
const anomalyDetector = require('../services/anomalyDetector');
const rollback = require('../services/rollback');

function genCaseNo() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `ARB${ymd}${rand}`;
}

router.post('/', (req, res) => {
  const { merchant_id, order_no, complaint_source, complaint_detail, operator } = req.body;
  if (!merchant_id || !complaint_source) {
    return res.status(400).json({ error: 'merchant_id 和 complaint_source 为必填项' });
  }

  const db = getDb();
  const case_no = genCaseNo();

  try {
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO arbitration_cases (case_no, merchant_id, order_no, complaint_source, complaint_detail, status, current_handler)
        VALUES (?, ?, ?, ?, ?, 'created', ?)
      `).run(case_no, merchant_id, order_no || null, complaint_source, complaint_detail || null, operator || null);

      db.prepare(`
        INSERT INTO arbitration_status_log (case_no, from_status, to_status, operator, remark)
        VALUES (?, 'created', 'created', ?, '工单创建')
      `).run(case_no, operator || 'system');
    });
    tx();

    const anomalies = anomalyDetector.detectForCase(case_no);
    if (anomalies.length > 0) {
      anomalyDetector.saveAnomalies(case_no, anomalies);
    }

    const created = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(case_no);
    res.status(201).json({
      ...created,
      detected_anomalies: anomalies,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  const { status, merchant_id, order_no, limit, offset } = req.query;

  let sql = 'SELECT * FROM arbitration_cases WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (merchant_id) { sql += ' AND merchant_id = ?'; params.push(merchant_id); }
  if (order_no) { sql += ' AND order_no = ?'; params.push(order_no); }

  sql += ' ORDER BY created_at DESC';

  const l = parseInt(limit) || 50;
  const o = parseInt(offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(l, o);

  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM arbitration_cases').get().cnt;

  res.json({ total, limit: l, offset: o, data: rows });
});

router.get('/:caseNo', (req, res) => {
  const db = getDb();
  const c = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(req.params.caseNo);
  if (!c) return res.status(404).json({ error: '工单不存在' });

  const statusLogs = db.prepare('SELECT * FROM arbitration_status_log WHERE case_no = ? ORDER BY created_at').all(req.params.caseNo);
  const anomalies = anomalyDetector.getAnomalies(req.params.caseNo);
  const corrections = rollback.getCorrectionHistory(req.params.caseNo);
  const rollbackLogs = rollback.getRollbackLogs(req.params.caseNo);

  let orderDetail = null;
  let refundDetails = [];
  let subsidyDetails = [];
  let ruleDetail = null;

  if (c.order_no) {
    orderDetail = db.prepare('SELECT * FROM merchant_orders WHERE order_no = ?').get(c.order_no);
    if (orderDetail) {
      refundDetails = db.prepare('SELECT * FROM refund_records WHERE order_no = ?').all(c.order_no);
      subsidyDetails = db.prepare('SELECT * FROM platform_subsidies WHERE order_no = ?').all(c.order_no);
      ruleDetail = db.prepare('SELECT * FROM split_rules WHERE rule_version = ? AND merchant_id = ?')
        .get(orderDetail.rule_version, c.merchant_id);
    }
  }

  res.json({
    case: c,
    status_logs: statusLogs,
    anomalies,
    corrections,
    rollback_logs: rollbackLogs,
    related_data: {
      order: orderDetail,
      refunds: refundDetails,
      subsidies: subsidyDetails,
      rule: ruleDetail,
    },
  });
});

router.post('/:caseNo/advance', (req, res) => {
  const { target_status, operator, remark } = req.body;
  if (!target_status) return res.status(400).json({ error: 'target_status 为必填' });

  try {
    const result = stateMachine.advance(req.params.caseNo, target_status, operator, remark);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:caseNo/assign', (req, res) => {
  const { handler } = req.body;
  if (!handler) return res.status(400).json({ error: 'handler 为必填' });

  try {
    const result = stateMachine.assignHandler(req.params.caseNo, handler);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:caseNo/opinion', (req, res) => {
  const { opinion, operator } = req.body;
  if (!opinion) return res.status(400).json({ error: 'opinion 为必填' });

  try {
    const result = stateMachine.setOpinion(req.params.caseNo, opinion, operator);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:caseNo/correct', (req, res) => {
  const { correction_type, target_record, original_value, corrected_value, operator, reason } = req.body;
  if (!correction_type || !target_record || !corrected_value) {
    return res.status(400).json({ error: 'correction_type, target_record, corrected_value 为必填' });
  }

  try {
    const id = rollback.recordCorrection(
      req.params.caseNo, correction_type, target_record,
      original_value, corrected_value, operator, reason
    );
    res.json({ id, message: '修正记录已保存' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:caseNo/rollback/compute', (req, res) => {
  try {
    const actions = rollback.computeRollback(req.params.caseNo);
    res.json({ case_no: req.params.caseNo, rollback_actions: actions });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:caseNo/rollback/execute', (req, res) => {
  const { actions, operator } = req.body;
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({ error: 'actions 数组为必填' });
  }

  try {
    const logs = rollback.executeRollback(req.params.caseNo, actions, operator);
    res.json({ case_no: req.params.caseNo, executed: logs.length, logs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/status/chain', (req, res) => {
  res.json(stateMachine.getStatusChain());
});

module.exports = router;
