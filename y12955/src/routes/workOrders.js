const express = require('express');
const router = express.Router();
const workOrderService = require('../services/workOrderService');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler((req, res) => {
  const { status, page, pageSize } = req.query;
  const result = workOrderService.listWorkOrders({
    status,
    page: page ? parseInt(page) : 1,
    pageSize: pageSize ? parseInt(pageSize) : 20
  });
  
  res.json({
    success: true,
    data: result
  });
}));

router.post('/', asyncHandler((req, res) => {
  const workOrder = workOrderService.createWorkOrder(req.body);
  res.status(201).json({
    success: true,
    data: workOrder
  });
}));

router.get('/:id', asyncHandler((req, res) => {
  const workOrder = workOrderService.getWorkOrderById(req.params.id);
  
  const transitions = workOrderService.listStatusTransitions(req.params.id);
  const versions = workOrderService.listDictionaryVersions(req.params.id);
  const batches = workOrderService.listImportBatches(req.params.id);
  
  res.json({
    success: true,
    data: {
      ...workOrder,
      status_transitions: transitions,
      dictionary_versions: versions,
      import_batches: batches
    }
  });
}));

router.put('/:id', asyncHandler((req, res) => {
  const workOrder = workOrderService.updateWorkOrder(req.params.id, req.body);
  res.json({
    success: true,
    data: workOrder
  });
}));

router.delete('/:id', asyncHandler((req, res) => {
  const result = workOrderService.deleteWorkOrder(req.params.id);
  res.json({ success: true, data: result });
}));

router.post('/:id/status', asyncHandler((req, res) => {
  const { status, operator, remark } = req.body;
  const workOrder = workOrderService.transitionStatus(
    req.params.id,
    status,
    operator || 'system',
    remark || ''
  );
  res.json({
    success: true,
    data: workOrder,
    message: `状态已更新为: ${status}`
  });
}));

router.get('/:id/status-transitions', asyncHandler((req, res) => {
  const transitions = workOrderService.listStatusTransitions(req.params.id);
  res.json({
    success: true,
    data: transitions
  });
}));

router.post('/:id/import/dictionary', asyncHandler((req, res) => {
  const { version, records, file_name } = req.body;
  const result = workOrderService.importDictionary(
    req.params.id,
    version,
    records,
    file_name
  );
  res.json({
    success: true,
    data: result
  });
}));

router.get('/:id/dictionary/versions', asyncHandler((req, res) => {
  const versions = workOrderService.listDictionaryVersions(req.params.id);
  res.json({
    success: true,
    data: versions
  });
}));

router.get('/:id/dictionary/:version', asyncHandler((req, res) => {
  const dict = workOrderService.getDictionaryByVersion(
    req.params.id,
    req.params.version
  );
  res.json({
    success: true,
    data: dict
  });
}));

router.get('/:id/import-batches', asyncHandler((req, res) => {
  const { type } = req.query;
  const batches = workOrderService.listImportBatches(req.params.id, type);
  res.json({
    success: true,
    data: batches
  });
}));

module.exports = router;
