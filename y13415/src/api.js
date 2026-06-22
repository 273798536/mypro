const express = require('express');
const router = express.Router();
const { RecordDAO } = require('./dao');
const business = require('./business');

router.use(express.json());

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cut-vertex-review', timestamp: new Date().toISOString() });
});

router.post('/records', (req, res) => {
  try {
    const { package_no, graph_data, expected_cut_points, unit, threshold, parameter_version } = req.body;

    if (!package_no) {
      return res.status(400).json({ error: '缺少必填字段: package_no' });
    }
    if (!graph_data) {
      return res.status(400).json({ error: '缺少必填字段: graph_data' });
    }

    const operator = req.headers['x-operator'] || 'anonymous';
    const result = business.validateAndProcess({
      package_no,
      graph_data,
      expected_cut_points,
      unit,
      threshold,
      parameter_version
    }, operator);

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records', (req, res) => {
  try {
    const { status, package_no } = req.query;
    let records;

    if (package_no) {
      records = RecordDAO.getByPackageNo(package_no);
    } else {
      records = RecordDAO.getAll(status);
    }

    res.json({ success: true, count: records.length, data: records });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records/:id', (req, res) => {
  try {
    const detail = business.getRecordDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true, data: detail });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/records/:id/review', (req, res) => {
  try {
    const { reviewer, comment, status } = req.body;
    if (!reviewer) {
      return res.status(400).json({ error: '缺少必填字段: reviewer' });
    }
    const operator = req.headers['x-operator'] || reviewer;
    const result = business.reviewRecord(req.params.id, reviewer, comment, status);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/records/:id/withdraw', (req, res) => {
  try {
    const { reason } = req.body;
    const operator = req.headers['x-operator'] || 'anonymous';
    if (!reason) {
      return res.status(400).json({ error: '缺少必填字段: reason' });
    }
    const result = business.requestWithdrawal(req.params.id, operator, reason);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/records/:id/withdraw/judge', (req, res) => {
  try {
    const { action_id, approved, judgment_note } = req.body;
    const operator = req.headers['x-operator'] || 'anonymous';

    if (!action_id) {
      return res.status(400).json({ error: '缺少必填字段: action_id' });
    }
    if (approved === undefined) {
      return res.status(400).json({ error: '缺少必填字段: approved (true/false)' });
    }
    if (!judgment_note) {
      return res.status(400).json({ error: '缺少必填字段: judgment_note' });
    }

    const result = business.judgeWithdrawal(action_id, req.params.id, approved, judgment_note, operator);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/records/:id/parameter', (req, res) => {
  try {
    const {
      param_name, old_value, new_value,
      old_unit, new_unit, conversion_factor,
      threshold_old, threshold_new, reason
    } = req.body;
    const operator = req.headers['x-operator'] || 'anonymous';

    if (!param_name || !new_value) {
      return res.status(400).json({ error: '缺少必填字段: param_name, new_value' });
    }
    if (!reason) {
      return res.status(400).json({ error: '缺少必填字段: reason' });
    }

    const result = business.updateParameter(
      req.params.id, param_name, old_value, new_value,
      old_unit, new_unit, conversion_factor,
      threshold_old, threshold_new, operator, reason
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/exceptions/summary', (req, res) => {
  try {
    const summary = business.getExceptionSummary();
    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records/:id/exceptions', (req, res) => {
  try {
    const detail = business.getRecordDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true, data: detail.exceptions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records/:id/history', (req, res) => {
  try {
    const detail = business.getRecordDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true, data: detail.status_history });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records/:id/parameters', (req, res) => {
  try {
    const detail = business.getRecordDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true, data: detail.parameter_versions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/records/:id/review-actions', (req, res) => {
  try {
    const detail = business.getRecordDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true, data: detail.review_actions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
