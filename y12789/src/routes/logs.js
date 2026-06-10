const express = require('express');
const router = express.Router();
const logService = require('../services/logService');

router.get('/operations', (req, res) => {
  try {
    const params = {
      target_type: req.query.target_type || null,
      target_id: req.query.target_id ? parseInt(req.query.target_id) : null,
      operation_type: req.query.operation_type || null,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 50
    };
    const result = logService.listLogs(params);
    res.json({ code: 0, data: result });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/trace/:targetType/:targetId', (req, res) => {
  try {
    const logs = logService.getOperationTrace(req.params.targetType, req.params.targetId);
    res.json({ code: 0, data: logs });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/alerts', (req, res) => {
  try {
    const alerts = logService.listActiveAlerts();
    res.json({ code: 0, data: alerts });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

module.exports = router;
