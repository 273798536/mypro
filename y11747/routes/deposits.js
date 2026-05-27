const express = require('express');
const store = require('../models/store');
const queueService = require('../services/queueService');
const alertService = require('../services/alertService');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = store.loadDB();
    const queue = queueService.buildQueue(db);
    const alerts = db.alerts.filter(a => !a.resolved);
    res.json({ queue, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/process-all', (req, res) => {
  try {
    const db = store.loadDB();
    const result = queueService.processAllReady(db);
    store.saveDB(db);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:orderId/lock', (req, res) => {
  try {
    const db = store.loadDB();
    const { depositFlowId } = req.body;
    const result = queueService.lockDeposit(db, depositFlowId);
    store.saveDB(db);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/:orderId/deduct-damage', (req, res) => {
  try {
    const db = store.loadDB();
    const { damageId } = req.body;
    const result = queueService.deductDamage(db, req.params.orderId, damageId);
    alertService.mergeAndSaveAlerts(db);
    store.saveDB(db);
    res.json({ success: true, damage: result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/:orderId/release', (req, res) => {
  try {
    const db = store.loadDB();
    const queue = queueService.buildQueue(db);
    const item = queue.find(q => q.orderId === req.params.orderId);

    if (!item) {
      return res.status(404).json({ success: false, error: '订单不在释放队列中' });
    }

    if (!item.canRelease) {
      return res.status(400).json({
        success: false,
        error: '订单存在未解决问题，无法释放',
        issues: item.issues,
        alert: '请先处理客损抵扣或渠道回执问题'
      });
    }

    queueService.lockDeposit(db, item.depositFlowId);
    const release = queueService.processRelease(db, item);
    queueService.completeRelease(db, release.id);

    alertService.mergeAndSaveAlerts(db);
    store.saveDB(db);

    res.json({
      success: true,
      release: {
        id: release.id,
        orderId: item.orderId,
        amount: item.releaseAmount,
        status: 'completed'
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/releases/:releaseId/retry', (req, res) => {
  try {
    const db = store.loadDB();
    const result = queueService.retryRelease(db, req.params.releaseId);
    store.saveDB(db);
    res.json({ success: true, release: result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/releases/:releaseId/cancel', (req, res) => {
  try {
    const db = store.loadDB();
    const { reason } = req.body;
    const result = queueService.cancelRelease(db, req.params.releaseId, reason);
    store.saveDB(db);
    res.json({ success: true, release: result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get('/:orderId/summary', (req, res) => {
  try {
    const db = store.loadDB();
    const summary = queueService.getOrderReleaseSummary(db, req.params.orderId);
    if (!summary) {
      return res.status(404).json({ error: '订单不存在' });
    }
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;