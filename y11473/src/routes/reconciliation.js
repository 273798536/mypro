const express = require('express');
const router = express.Router();
const ReconciliationService = require('../services/ReconciliationService');
const AsyncTaskService = require('../services/AsyncTaskService');

router.post('/batch/:batchNo', async (req, res) => {
  try {
    const { batchNo } = req.params;
    const task = await AsyncTaskService.createTask(
      'reconciliation', `批次对账: ${batchNo}`,
      { batchNo },
      { createdBy: req.user || 'api', priority: 8 }
    );
    res.json({ taskId: task.id, message: '对账任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/all', async (req, res) => {
  try {
    const task = await AsyncTaskService.createTask(
      'reconciliation', '全量对账',
      { all: true },
      { createdBy: req.user || 'api', priority: 7 }
    );
    res.json({ taskId: task.id, message: '全量对账任务已创建' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/report/:batchNo?', async (req, res) => {
  try {
    const { batchNo } = req.params;
    const report = await ReconciliationService.getReconciliationReport(batchNo);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
