const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

router.post('/:batchId/generate', (req, res) => {
  try {
    const { generator, version } = req.body;
    const result = reportService.generateReport(
      req.params.batchId,
      generator || '系统',
      version ? parseInt(version) : null
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/latest', (req, res) => {
  try {
    const report = reportService.getLatestReport(req.params.batchId);
    if (!report) {
      return res.status(404).json({ success: false, error: '暂无报告' });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/version/:version', (req, res) => {
  try {
    const report = reportService.getReportByVersion(
      req.params.batchId,
      parseInt(req.params.version)
    );
    if (!report) {
      return res.status(404).json({ success: false, error: '该版本报告不存在' });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/all', (req, res) => {
  try {
    const reports = reportService.getAllReports(req.params.batchId);
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/export', (req, res) => {
  try {
    const version = req.query.version ? parseInt(req.query.version) : null;
    const report = reportService.exportReportText(req.params.batchId, version);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.txt"`);
    res.send(report.content);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
