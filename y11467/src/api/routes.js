const express = require('express');
const router = express.Router();
const retryQueueService = require('../services/retryQueueService');
const dirtyRecordService = require('../services/dirtyRecordService');
const dataConsistencyService = require('../services/dataConsistencyService');
const { retryQueueDAO, deadLetterDAO } = require('../dao');

router.post('/receipt', async (req, res) => {
  try {
    const data = req.body;
    const queueId = await retryQueueService.submitReceipt({
      ...data,
      operator: req.headers['x-operator'] || 'api-user'
    });
    
    if (data.transferOrders) {
      await dirtyRecordService.detectAndCreateDirtyRecords(queueId, 'transfer', data.transferOrders);
    }
    if (data.sizeOpinions) {
      await dirtyRecordService.detectAndCreateDirtyRecords(queueId, 'size', data.sizeOpinions);
    }
    if (data.fabricRecords) {
      await dirtyRecordService.detectAndCreateDirtyRecords(queueId, 'fabric', data.fabricRecords);
    }
    
    res.json({ success: true, queueId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let where = '';
    let params = [];
    
    if (status) {
      where = 'WHERE status = ?';
      params.push(status);
    }
    
    const queues = await retryQueueDAO.findAll(
      `${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    res.json({ success: true, data: queues });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue/:id', async (req, res) => {
  try {
    const details = await retryQueueService.getQueueDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Queue not found' });
    }
    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue/:id/unified', async (req, res) => {
  try {
    const data = await dataConsistencyService.getUnifiedFactSource(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Queue not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue/:id/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = await dataConsistencyService.exportUnifiedData(req.params.id, format);
    
    if (!data) {
      return res.status(404).json({ success: false, error: 'Queue not found' });
    }
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="queue-${req.params.id}.csv"`);
      res.send(data);
    } else {
      res.json({ success: true, data });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue/:id/history', async (req, res) => {
  try {
    const { recordType, recordId } = req.query;
    let history;
    
    if (recordType && recordId) {
      history = await dataConsistencyService.getRecordHistory(recordType, recordId);
    } else {
      history = await dataConsistencyService.versionHistoryDAO.getQueueHistory(req.params.id);
    }
    
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/queue/:id/manual', async (req, res) => {
  try {
    const operator = req.headers['x-operator'] || 'manual-operator';
    await retryQueueService.manualTakeover(req.params.id, operator);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/queue/:id/close', async (req, res) => {
  try {
    const operator = req.headers['x-operator'] || 'manual-operator';
    const { reason } = req.body;
    await retryQueueService.closeQueue(req.params.id, operator, reason);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/process', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    const results = await retryQueueService.processQueue(limit);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dirty', async (req, res) => {
  try {
    const records = await dirtyRecordService.getPendingDirtyRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/dirty/:id/correct', async (req, res) => {
  try {
    const operator = req.headers['x-operator'] || 'corrector';
    const { correctedData } = req.body;
    await dirtyRecordService.correctDirtyRecord(req.params.id, correctedData, operator);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/dirty/:queueId/auto-correct', async (req, res) => {
  try {
    const corrected = await dirtyRecordService.autoCorrect(req.params.queueId);
    res.json({ success: true, correctedCount: corrected.length, corrected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dead-letter', async (req, res) => {
  try {
    const records = await deadLetterDAO.getRecoverable();
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const queueStats = await retryQueueService.getStatistics();
    const dirtyStats = await dirtyRecordService.getDirtyStats();
    
    res.json({
      success: true,
      data: {
        queue: queueStats,
        dirtyRecords: dirtyStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
