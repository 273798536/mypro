const express = require('express');
const router = express.Router();
const reviewService = require('../services/reviewService');

router.get('/:batchId/summary', (req, res) => {
  try {
    const version = req.query.version ? parseInt(req.query.version) : null;
    const summary = reviewService.getReviewSummary(req.params.batchId, version);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:batchId/submit', (req, res) => {
  try {
    const { reviewer, comment } = req.body;
    const result = reviewService.submitBatchReview(req.params.batchId, reviewer || '科研助理', comment);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:batchId/item', (req, res) => {
  try {
    const { material_type, item_id, review_result, reviewer, comment } = req.body;
    if (!material_type || !item_id || !review_result) {
      return res.status(400).json({ success: false, error: '材料类型、记录ID和复核结果不能为空' });
    }
    const result = reviewService.reviewSingleItem(
      req.params.batchId,
      material_type,
      item_id,
      review_result,
      reviewer || '科研助理',
      comment
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:batchId/buoy/:buoyId', (req, res) => {
  try {
    const { updates, reviewer, comment } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: '更新内容不能为空' });
    }
    const result = reviewService.reviewBuoyItem(
      req.params.batchId,
      req.params.buoyId,
      updates,
      reviewer || '科研助理',
      comment
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/photos/missing', (req, res) => {
  try {
    const version = req.query.version ? parseInt(req.query.version) : null;
    const missing = reviewService.getMissingPhotoList(req.params.batchId, version);
    res.json({ success: true, data: missing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/duplicates', (req, res) => {
  try {
    const duplicates = reviewService.getDuplicateList(req.params.batchId);
    res.json({ success: true, data: duplicates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:batchId/duplicates/:dupId/resolve', (req, res) => {
  try {
    const { resolution, reviewer } = req.body;
    if (!resolution) {
      return res.status(400).json({ success: false, error: '处理结果不能为空' });
    }
    const result = reviewService.resolveDuplicate(
      req.params.batchId,
      req.params.dupId,
      resolution,
      reviewer || '科研助理'
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
