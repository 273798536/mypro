const express = require('express');
const router = express.Router();
const batchService = require('../services/batchService');

router.get('/', (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const batches = batchService.listBatches(parseInt(limit), parseInt(offset));
  res.json({ success: true, data: batches });
});

router.get('/:id', (req, res) => {
  const batch = batchService.getBatchById(req.params.id);
  if (!batch) {
    return res.status(404).json({ success: false, message: '批次不存在' });
  }
  res.json({ success: true, data: batch });
});

router.post('/', (req, res) => {
  const { name, notes } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: '批次名称必填' });
  }
  const batch = batchService.createBatch(name, notes || '');
  res.json({ success: true, data: batch });
});

router.delete('/:id', (req, res) => {
  batchService.deleteBatch(req.params.id);
  res.json({ success: true });
});

router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  try {
    const batch = batchService.updateBatchStatus(req.params.id, status);
    res.json({ success: true, data: batch });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

module.exports = router;
