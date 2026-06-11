const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');

router.get('/:id/csv', (req, res) => {
  try {
    const report = exportService.exportReportCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.content);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id/json', (req, res) => {
  try {
    const report = exportService.exportReportJson(req.params.id);
    res.json({ success: true, data: report });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
