const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const retryService = require('../services/retryService');
const { authenticate, requireAction, ROLES, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/failed-events', (req, res) => {
  const { resolved = '0', limit = '100' } = req.query;
  const events = reportService.getFailedEvents(parseInt(resolved), parseInt(limit));
  res.json(events);
});

router.post('/failed-events/:id/resolve', requireRole(ROLES.SUPERVISOR, ROLES.REVIEW), (req, res) => {
  try {
    const { notes } = req.body;
    reportService.resolveFailedEvent(req.params.id, notes || '人工标记已解决');
    res.json({ success: true, message: '失败事件已标记为已解决' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/summary', (req, res) => {
  const report = reportService.getSummaryReport();
  res.json(report);
});

router.get('/manager-dashboard', requireRole(ROLES.SUPERVISOR, ROLES.REVIEW), (req, res) => {
  const dashboard = reportService.getManagerDashboard();
  res.json(dashboard);
});

router.get('/daily', (req, res) => {
  const { date } = req.query;
  const report = reportService.getDailyReport(date);
  res.json(report);
});

router.get('/retry-queue', (req, res) => {
  const queue = retryService.getRetryQueue();
  res.json(queue);
});

router.get('/dead-letter', (req, res) => {
  const queue = retryService.getDeadLetterQueue();
  res.json(queue);
});

router.get('/retry-stats', (req, res) => {
  const stats = retryService.getRetryStats();
  res.json(stats);
});

router.post('/process-retries', requireRole(ROLES.SUPERVISOR), (req, res) => {
  const results = retryService.processDueRetries();
  res.json({ processed: results.length, results });
});

module.exports = router;
