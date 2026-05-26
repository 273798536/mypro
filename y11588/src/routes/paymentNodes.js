const express = require('express');
const router = express.Router();
const { createPaymentNode, getPaymentNode, updatePaymentNode, updateNodeStatus, listPaymentNodes, calculateContractProgress } = require('../models/PaymentNode');
const { filterFields, filterList, requirePermission } = require('../middleware/auth');

router.post('/', requirePermission('canCreate', 'paymentNode'), (req, res) => {
  const result = createPaymentNode(req.body, req.user.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  const filteredData = filterFields(req.userRole, 'paymentNode', result.data);
  res.json({
    ...result,
    data: filteredData
  });
});

router.get('/', requirePermission('canRead', 'paymentNode'), (req, res) => {
  const nodes = listPaymentNodes(req.query);
  const filtered = filterList(req.userRole, 'paymentNode', nodes);
  res.json({
    success: true,
    data: filtered,
    total: filtered.length
  });
});

router.get('/progress/:contractId', requirePermission('canRead', 'paymentNode'), (req, res) => {
  const progress = calculateContractProgress(req.params.contractId);
  res.json({
    success: true,
    data: progress
  });
});

router.get('/:id', requirePermission('canRead', 'paymentNode'), (req, res) => {
  const node = getPaymentNode(req.params.id);
  if (!node) {
    return res.status(404).json({ success: false, error: '付款节点不存在', code: 'NOT_FOUND' });
  }
  res.json({
    success: true,
    data: filterFields(req.userRole, 'paymentNode', node)
  });
});

router.put('/:id', requirePermission('canUpdate', 'paymentNode'), (req, res) => {
  const result = updatePaymentNode(req.params.id, req.body, req.user.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({
    ...result,
    data: filterFields(req.userRole, 'paymentNode', result.data)
  });
});

router.post('/:id/status', requirePermission('canUpdate', 'paymentNode'), (req, res) => {
  const { status, notes } = req.body;
  const result = updateNodeStatus(req.params.id, status, req.user.id, notes);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

module.exports = router;
