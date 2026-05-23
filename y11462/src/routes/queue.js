const express = require('express');
const router = express.Router();
const QueueService = require('../services/queue.service');
const TraceService = require('../services/trace.service');
const validate = require('../middleware/validator');

router.post('/submit', validate('submitQueue'), async (req, res) => {
  try {
    const result = await QueueService.submit(req.validatedData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/list', validate('listQuery'), async (req, res) => {
  try {
    const { status, batchNo, department, page, pageSize } = req.validatedData;
    const result = await QueueService.list({ status, batchNo, department, page, pageSize });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await QueueService.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: '队列记录不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue-no/:queueNo', async (req, res) => {
  try {
    const result = await QueueService.getByQueueNo(req.params.queueNo);
    if (!result) {
      return res.status(404).json({ success: false, error: '队列记录不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/traces', async (req, res) => {
  try {
    const result = await TraceService.getTracesByQueueId(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/retry', validate('markForRetry'), async (req, res) => {
  try {
    const { errorMessage, operator, retryDelayMinutes } = req.validatedData;
    const result = await QueueService.markForRetry(req.params.id, errorMessage, { operator, retryDelayMinutes });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/fail-permanent', validate('markPermanentFailed'), async (req, res) => {
  try {
    const { errorMessage, operator } = req.validatedData;
    await QueueService.markPermanentFailed(req.params.id, errorMessage, operator);
    res.json({ success: true, message: '已标记为永久失败' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/manual-takeover', validate('manualTakeover'), async (req, res) => {
  try {
    const { operator, remark } = req.validatedData;
    await QueueService.manualTakeover(req.params.id, operator, remark);
    res.json({ success: true, message: '人工接管成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/compensate', validate('compensate'), async (req, res) => {
  try {
    const { operator, remark, parsedData } = req.validatedData;
    await QueueService.compensate(req.params.id, operator, remark, parsedData);
    res.json({ success: true, message: '补偿入账成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/close', validate('close'), async (req, res) => {
  try {
    const { operator, remark } = req.validatedData;
    await QueueService.close(req.params.id, operator, remark);
    res.json({ success: true, message: '关闭成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/statistics/overview', async (req, res) => {
  try {
    const result = await QueueService.getStatistics();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/retry/items', async (req, res) => {
  try {
    const result = await QueueService.getRetryableItems();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
