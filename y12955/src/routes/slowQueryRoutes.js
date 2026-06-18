const express = require('express');
const router = express.Router();
const slowQueryService = require('../services/slowQueryService');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/work-orders/:workOrderId/slow-queries', asyncHandler((req, res) => {
  const { related_table, min_time, page, pageSize } = req.query;
  const result = slowQueryService.listSlowQueries(req.params.workOrderId, {
    related_table,
    min_time,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 50
  });
  res.json({
    success: true,
    data: result
  });
}));

router.post('/work-orders/:workOrderId/slow-queries', asyncHandler((req, res) => {
  const { records, source_file } = req.body;
  const result = slowQueryService.importSlowQueryLog(
    req.params.workOrderId,
    records,
    source_file
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/slow-queries/:id', asyncHandler((req, res) => {
  const log = slowQueryService.getSlowQuery(req.params.id);
  res.json({
    success: true,
    data: log
  });
}));

router.patch('/slow-queries/:id/link-conclusion', asyncHandler((req, res) => {
  const { conclusion_ref, note } = req.body;
  const result = slowQueryService.linkToConclusion(
    req.params.id,
    conclusion_ref,
    note
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/work-orders/:workOrderId/slow-queries/by-table/:tableName', asyncHandler((req, res) => {
  const queries = slowQueryService.getSlowQueriesByTable(
    req.params.workOrderId,
    req.params.tableName
  );
  res.json({
    success: true,
    data: queries
  });
}));

router.get('/work-orders/:workOrderId/slow-queries/analyze/:comparisonId', asyncHandler((req, res) => {
  const result = slowQueryService.analyzeSlowQueriesForComparison(
    req.params.workOrderId,
    req.params.comparisonId
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/work-orders/:workOrderId/conclusions-with-slow-queries', asyncHandler((req, res) => {
  const result = slowQueryService.getConclusionsWithSlowQueries(req.params.workOrderId);
  res.json({
    success: true,
    data: result
  });
}));

module.exports = router;
