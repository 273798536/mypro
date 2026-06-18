const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/work-orders/:workOrderId/reports', asyncHandler((req, res) => {
  const reports = reportService.listReports(req.params.workOrderId);
  res.json({
    success: true,
    data: reports
  });
}));

router.post('/work-orders/:workOrderId/report', asyncHandler((req, res) => {
  const { comparison_id, report_type } = req.body;
  const result = reportService.generateReport(
    req.params.workOrderId,
    comparison_id,
    report_type || 'full'
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/reports/:id', asyncHandler((req, res) => {
  const report = reportService.getReport(req.params.id);
  res.json({
    success: true,
    data: report
  });
}));

router.get('/reports/:id/export', asyncHandler((req, res) => {
  const { format } = req.query;
  const result = reportService.exportReport(
    req.params.id,
    format || 'json'
  );
  
  if (format === 'summary') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.txt"`);
    res.send(result.data);
  } else {
    res.json({
      success: true,
      data: result
    });
  }
}));

router.patch('/reports/:id/review', asyncHandler((req, res) => {
  const { reviewer, status } = req.body;
  const report = reportService.reviewReport(
    req.params.id,
    reviewer || 'system',
    status || 'reviewed'
  );
  res.json({
    success: true,
    data: report
  });
}));

module.exports = router;
