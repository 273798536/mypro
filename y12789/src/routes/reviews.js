const express = require('express');
const router = express.Router();
const reviewService = require('../services/reviewService');

router.post('/:conversionId', (req, res) => {
  try {
    const { result, opinion, reviewer } = req.body;
    if (!result || !['pass', 'reject'].includes(result)) {
      return res.status(400).json({ code: 1, message: '复核结果必须是 pass 或 reject' });
    }
    const review = reviewService.review(
      req.params.conversionId,
      result,
      opinion,
      reviewer || 'engineer'
    );
    res.json({ code: 0, data: review });
  } catch (e) {
    res.status(400).json({ code: 1, message: e.message });
  }
});

router.get('/:conversionId', (req, res) => {
  try {
    const reviews = reviewService.getReviews(req.params.conversionId);
    res.json({ code: 0, data: reviews });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

module.exports = router;
