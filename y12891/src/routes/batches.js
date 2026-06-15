const express = require('express');
const router = express.Router();
const batchService = require('../services/batchService');

router.get('/', (req, res) => {
  try {
    const batches = batchService.getAllBatches();
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const batch = batchService.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: '批次不存在' });
    }
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { batch_no, name, description } = req.body;
    if (!batch_no || !name) {
      return res.status(400).json({ success: false, error: '批次号和名称不能为空' });
    }
    const batch = batchService.createBatch(batch_no, name, description);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/materials', (req, res) => {
  try {
    const version = req.query.version ? parseInt(req.query.version) : null;
    const materials = batchService.getBatchMaterials(req.params.id, version);
    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/history', (req, res) => {
  try {
    const history = batchService.getVersionHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
