const express = require('express');
const router = express.Router();
const compensationService = require('../services/compensationService');
const { authenticate, requireAction, filterFields } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { status, event_id } = req.query;
  const compensations = compensationService.getCompensations({ status, event_id });
  res.json(compensations);
});

router.get('/:id', (req, res) => {
  const compensation = compensationService.getCompensationById(req.params.id);
  if (!compensation) {
    return res.status(404).json({ error: '补偿记录不存在' });
  }
  res.json(compensation);
});

router.post('/:id/review', requireAction('review'), (req, res) => {
  try {
    const { approved, notes } = req.body;
    const compensation = compensationService.reviewCompensation(
      req.params.id,
      req.user.id,
      approved,
      notes
    );
    res.json(compensation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/post', requireAction('post_compensation'), (req, res) => {
  try {
    const compensation = compensationService.postCompensation(req.params.id, req.user.id);
    res.json(compensation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats/summary', (req, res) => {
  const stats = compensationService.getCompensationStats();
  res.json(stats);
});

module.exports = router;
