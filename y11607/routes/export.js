const express = require('express');
const router = express.Router();
const reportService = require('../services/report');
const anomalyDetector = require('../services/anomalyDetector');

router.get('/arbitration', (req, res) => {
  try {
    const report = reportService.buildArbitrationReport();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/arbitration/csv', (req, res) => {
  try {
    const report = reportService.buildArbitrationReport();
    const files = reportService.exportCsv(report);
    res.json({
      summary: report.summary,
      exported_files: files,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/anomalies/csv', (req, res) => {
  try {
    const anomalies = anomalyDetector.getAnomalies();
    const file = reportService.exportAnomaliesCsv(anomalies);
    res.json({
      count: anomalies.length,
      exported_file: file,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
