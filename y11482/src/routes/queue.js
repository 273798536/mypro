const express = require('express');
const router = express.Router();
const CompensationQueueService = require('../services/compensationQueueService');
const AuditService = require('../services/auditService');
const ExportService = require('../services/exportService');

router.post('/submit', async (req, res) => {
  try {
    const result = await CompensationQueueService.submitReceipt({
      ...req.body,
      operatorId: req.headers['x-operator-id'],
      operatorName: req.headers['x-operator-name'] || 'system'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await CompensationQueueService.list(req.query);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const stats = await CompensationQueueService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/dead-letter', async (req, res) => {
  try {
    const { startTime, endTime, limit } = req.query;
    const items = await CompensationQueueService.getDeadLetterItems(
      startTime,
      endTime,
      limit ? parseInt(limit) : 1000
    );
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await CompensationQueueService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    const item = await CompensationQueueService.startProcessing(
      req.params.id,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system'
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/success', async (req, res) => {
  try {
    const item = await CompensationQueueService.markSuccess(
      req.params.id,
      req.body.result,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system'
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const item = await CompensationQueueService.markRetry(
      req.params.id,
      req.body.error,
      req.body.errorCode,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system'
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/manual', async (req, res) => {
  try {
    const item = await CompensationQueueService.markManualIntervention(
      req.params.id,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system',
      req.body.remark
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/compensate', async (req, res) => {
  try {
    const item = await CompensationQueueService.manualCompensate(
      req.params.id,
      req.body.result,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system',
      req.body.remark
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/close', async (req, res) => {
  try {
    const item = await CompensationQueueService.close(
      req.params.id,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system',
      req.body.remark
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/rejudge', async (req, res) => {
  try {
    const item = await CompensationQueueService.rejudge(
      req.params.id,
      req.body.updates,
      req.headers['x-operator-id'],
      req.headers['x-operator-name'] || 'system',
      req.body.remark
    );
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/audit-logs', async (req, res) => {
  try {
    const logs = await AuditService.getEntityLogs('compensation_queue', req.params.id);
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/export', async (req, res) => {
  try {
    const result = await ExportService.exportQueueToCsv(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/export/dead-letter', async (req, res) => {
  try {
    const result = await ExportService.exportDeadLetterToCsv(
      req.body.startTime,
      req.body.endTime
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
