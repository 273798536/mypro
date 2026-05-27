const express = require('express');
const store = require('../models/store');
const reportService = require('../services/reportService');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = store.loadDB();
    const { startDate, endDate, status } = req.query;
    const report = reportService.generateReport(db, { startDate, endDate, status });
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/export', (req, res) => {
  try {
    const db = store.loadDB();
    const { format = 'json', startDate, endDate, status } = req.query;
    const result = reportService.exportReport(db, format, { startDate, endDate, status });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;