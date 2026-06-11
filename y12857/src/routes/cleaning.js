const express = require('express');
const router = express.Router();
const cleaningService = require('../services/cleaningService');
const reviewService = require('../services/reviewService');

router.post('/:id/clean', (req, res) => {
  try {
    const result = cleaningService.runCleaning(req.params.id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id/anomalies', (req, res) => {
  const { riskLevel, limit = 100, offset = 0 } = req.query;
  const anomalies = cleaningService.listAnomalies(
    req.params.id,
    riskLevel || null,
    parseInt(limit),
    parseInt(offset)
  );
  res.json({ success: true, data: anomalies });
});

router.get('/anomalies/:anomalyId', (req, res) => {
  const detail = cleaningService.getAnomalyDetail(req.params.anomalyId);
  if (!detail) {
    return res.status(404).json({ success: false, message: '异常记录不存在' });
  }
  res.json({ success: true, data: detail });
});

router.get('/:id/water-gaps', (req, res) => {
  const gaps = reviewService.getWaterGaps(req.params.id);
  res.json({ success: true, data: gaps });
});

router.post('/:id/review', (req, res) => {
  const { anomalyId, opinion, action, reviewer } = req.body;
  if (!opinion) {
    return res.status(400).json({ success: false, message: '复核意见必填' });
  }
  const result = reviewService.addReviewOpinion(
    req.params.id,
    anomalyId,
    opinion,
    action,
    reviewer || ''
  );
  res.json({ success: true, data: result });
});

router.get('/:id/reviews', (req, res) => {
  const { anomalyId } = req.query;
  const reviews = reviewService.listReviewOpinions(req.params.id, anomalyId || null);
  res.json({ success: true, data: reviews });
});

router.post('/:id/submit-review', (req, res) => {
  const { reviewer } = req.body;
  try {
    const result = reviewService.submitReview(req.params.id, reviewer || '');
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
