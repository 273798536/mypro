const express = require('express');
const store = require('../models/store');
const alertService = require('../services/alertService');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = store.loadDB();
    const { resolved } = req.query;

    let alerts = db.alerts;
    if (resolved === 'false') {
      alerts = alerts.filter(a => !a.resolved);
    } else if (resolved === 'true') {
      alerts = alerts.filter(a => a.resolved);
    }

    const counts = {
      total: alerts.length,
      high: alerts.filter(a => a.severity === 'high' && !a.resolved).length,
      medium: alerts.filter(a => a.severity === 'medium' && !a.resolved).length,
      low: alerts.filter(a => a.severity === 'low' && !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length
    };

    res.json({ alerts, counts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:alertId/resolve', (req, res) => {
  try {
    const db = store.loadDB();
    const result = alertService.resolveAlert(db, req.params.alertId);
    if (!result) {
      return res.status(404).json({ error: '告警不存在' });
    }
    store.saveDB(db);
    res.json({ success: true, alert: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/re-detect', (req, res) => {
  try {
    const db = store.loadDB();
    const alerts = alertService.mergeAndSaveAlerts(db);
    store.saveDB(db);
    res.json({ success: true, alertCount: alerts.length, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;