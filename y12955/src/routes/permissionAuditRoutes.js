const express = require('express');
const router = express.Router();
const permissionAuditService = require('../services/permissionAuditService');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/work-orders/:workOrderId/permission-lists', asyncHandler((req, res) => {
  const lists = permissionAuditService.listPermissionLists(req.params.workOrderId);
  res.json({
    success: true,
    data: lists
  });
}));

router.post('/work-orders/:workOrderId/permission-lists', asyncHandler((req, res) => {
  const result = permissionAuditService.importPermissionList(
    req.params.workOrderId,
    req.body
  );
  res.status(201).json({
    success: true,
    data: result
  });
}));

router.get('/permission-lists/:id', asyncHandler((req, res) => {
  const list = permissionAuditService.getPermissionList(req.params.id);
  res.json({
    success: true,
    data: list
  });
}));

router.get('/work-orders/:workOrderId/permission-audits', asyncHandler((req, res) => {
  const audits = permissionAuditService.listAudits(req.params.workOrderId);
  res.json({
    success: true,
    data: audits
  });
}));

router.post('/work-orders/:workOrderId/permission-audit', asyncHandler((req, res) => {
  const result = permissionAuditService.executeAudit(
    req.params.workOrderId,
    req.body
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/permission-audits/:id', asyncHandler((req, res) => {
  const audit = permissionAuditService.getAudit(req.params.id);
  res.json({
    success: true,
    data: audit
  });
}));

router.patch('/permission-audits/:id/review', asyncHandler((req, res) => {
  const audit = permissionAuditService.reviewAudit(
    req.params.id,
    req.body
  );
  res.json({
    success: true,
    data: audit
  });
}));

module.exports = router;
