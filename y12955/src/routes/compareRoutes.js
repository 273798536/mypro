const express = require('express');
const router = express.Router();
const compareService = require('../services/compareService');
const workOrderService = require('../services/workOrderService');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/work-orders/:workOrderId/comparisons', asyncHandler((req, res) => {
  const comparisons = compareService.listComparisonsByWorkOrder(req.params.workOrderId);
  res.json({
    success: true,
    data: comparisons
  });
}));

router.post('/work-orders/:workOrderId/compare', asyncHandler((req, res) => {
  const { baseline_version, target_version } = req.body;
  const result = compareService.executeComparison(
    req.params.workOrderId,
    baseline_version,
    target_version
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/comparisons/:id', asyncHandler((req, res) => {
  const comparison = compareService.getComparisonById(req.params.id);
  
  const { change_type, reviewed, can_use_directly, page, pageSize } = req.query;
  const details = compareService.getComparisonDetails(req.params.id, {
    change_type,
    reviewed: reviewed !== undefined ? reviewed === 'true' : undefined,
    can_use_directly: can_use_directly !== undefined ? can_use_directly === 'true' : undefined,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 100
  });
  
  const rollbacks = compareService.getRollbackRecords(req.params.id);
  const indexSuggestions = compareService.getIndexSuggestions(req.params.id);
  
  res.json({
    success: true,
    data: {
      comparison,
      details,
      rollbacks,
      index_suggestions: indexSuggestions
    }
  });
}));

router.get('/comparisons/:id/details', asyncHandler((req, res) => {
  const { change_type, reviewed, can_use_directly, page, pageSize } = req.query;
  const details = compareService.getComparisonDetails(req.params.id, {
    change_type,
    reviewed: reviewed !== undefined ? reviewed === 'true' : undefined,
    can_use_directly: can_use_directly !== undefined ? can_use_directly === 'true' : undefined,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 100
  });
  res.json({
    success: true,
    data: details
  });
}));

router.patch('/drift-details/:id/review', asyncHandler((req, res) => {
  const { is_reviewed, review_note } = req.body;
  const detail = compareService.reviewDriftDetail(
    req.params.id,
    is_reviewed,
    review_note
  );
  res.json({
    success: true,
    data: detail
  });
}));

router.get('/comparisons/:id/rollback', asyncHandler((req, res) => {
  const rollbacks = compareService.getRollbackRecords(req.params.id);
  res.json({
    success: true,
    data: rollbacks
  });
}));

router.post('/rollback/:id/execute', asyncHandler((req, res) => {
  const { executor, note } = req.body;
  const rollback = compareService.executeRollback(
    req.params.id,
    executor || 'system',
    note || ''
  );
  res.json({
    success: true,
    data: rollback,
    message: '回滚已执行（模拟）'
  });
}));

router.get('/comparisons/:id/index-suggestions', asyncHandler((req, res) => {
  const suggestions = compareService.getIndexSuggestions(req.params.id);
  res.json({
    success: true,
    data: suggestions
  });
}));

router.patch('/index-suggestions/:id/adopt', asyncHandler((req, res) => {
  const { is_adopted, note } = req.body;
  const suggestion = compareService.adoptIndexSuggestion(
    req.params.id,
    is_adopted,
    note
  );
  res.json({
    success: true,
    data: suggestion
  });
}));

module.exports = router;
