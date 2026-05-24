const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');
const retryService = require('../services/retryService');
const compensationService = require('../services/compensationService');
const reportService = require('../services/reportService');
const { authenticate, requireAction, filterFields, ROLES } = require('../middleware/auth');

router.use(authenticate);

router.post('/calendar', requireAction('submit_event'), (req, res) => {
  try {
    const result = eventService.upsertEvent('calendar', req.body, req.user.id);
    res.json({
      success: true,
      isNew: result.isNew,
      eventKey: result.eventKey,
      event: filterFields(result.event, req.user.role)
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/access-card', requireAction('submit_event'), (req, res) => {
  try {
    const result = eventService.upsertEvent('access_card', req.body, req.user.id);
    res.json({
      success: true,
      isNew: result.isNew,
      eventKey: result.eventKey,
      event: filterFields(result.event, req.user.role)
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/cancel-message', requireAction('submit_event'), (req, res) => {
  try {
    const result = eventService.upsertEvent('cancel_message', req.body, req.user.id);
    res.json({
      success: true,
      isNew: result.isNew,
      eventKey: result.eventKey,
      event: filterFields(result.event, req.user.role)
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/supplement', requireAction('supplement'), (req, res) => {
  try {
    const result = eventService.upsertEvent('supplement', req.body, req.user.id);
    res.json({
      success: true,
      isNew: result.isNew,
      eventKey: result.eventKey,
      event: filterFields(result.event, req.user.role)
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', (req, res) => {
  const { status, source_type, event_type, room_id, limit = 100, offset = 0 } = req.query;
  const events = eventService.getEvents({
    status,
    source_type,
    event_type,
    room_id
  }, parseInt(limit), parseInt(offset));
  
  res.json(filterFields(events, req.user.role));
});

router.get('/:id', (req, res) => {
  const event = eventService.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: '事件不存在' });
  }
  res.json(filterFields(event, req.user.role));
});

router.get('/key/:eventKey', (req, res) => {
  const event = eventService.getEventByKey(req.params.eventKey);
  if (!event) {
    return res.status(404).json({ error: '事件不存在' });
  }
  res.json(filterFields(event, req.user.role));
});

router.get('/:id/detail', (req, res) => {
  const detail = compensationService.getEventWithCompensation(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: '事件不存在' });
  }
  res.json({
    event: filterFields(detail.event, req.user.role),
    compensations: detail.compensations,
    history: detail.history,
    retryLogs: detail.retryLogs
  });
});

router.get('/:id/audit-trail', (req, res) => {
  const trail = reportService.getEventAuditTrail(req.params.id);
  res.json(trail);
});

router.post('/:id/manual-takeover', requireAction('review'), (req, res) => {
  try {
    const { reason } = req.body;
    const event = compensationService.manualTakeover(req.params.id, req.user.id, reason);
    res.json(filterFields(event, req.user.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/retry', requireAction('manual_retry'), (req, res) => {
  try {
    const event = retryService.scheduleRetry(req.params.id, req.user.id, '人工触发重试');
    res.json(filterFields(event, req.user.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/execute-retry', requireAction('manual_retry'), (req, res) => {
  try {
    const event = retryService.executeRetry(req.params.id, req.user.id);
    res.json(filterFields(event, req.user.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/dead-letter', requireAction('dead_letter'), (req, res) => {
  try {
    const { reason } = req.body;
    const event = retryService.moveToDeadLetter(req.params.id, req.user.id, reason);
    res.json(filterFields(event, req.user.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/restore', requireAction('restore_dead_letter'), (req, res) => {
  try {
    const { reason } = req.body;
    const event = retryService.restoreFromDeadLetter(req.params.id, req.user.id, reason || '人工恢复');
    res.json(filterFields(event, req.user.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/close', requireAction('close'), (req, res) => {
  try {
    const { reason } = req.body;
    const event = compensationService.closeEvent(req.params.id, req.user.id, reason);
    res.json(filterFields(event, req.user.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/compensation', requireAction('review'), (req, res) => {
  try {
    const { compensation_type, amount, notes } = req.body;
    const compensation = compensationService.createCompensation(
      req.params.id,
      compensation_type,
      amount,
      notes
    );
    res.json(compensation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
