const express = require('express');
const router = express.Router();
const { createConfirmation, getConfirmation, approveConfirmation, listConfirmations } = require('../models/Confirmation');
const { filterFields, filterList, requirePermission } = require('../middleware/auth');

router.post('/', requirePermission('canCreate', 'confirmation'), (req, res) => {
  const result = createConfirmation(req.body, req.user.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  const filteredData = filterFields(req.userRole, 'confirmation', result.data);
  res.json({
    ...result,
    data: filteredData
  });
});

router.get('/', requirePermission('canRead', 'confirmation'), (req, res) => {
  const confirmations = listConfirmations(req.query);
  const filtered = filterList(req.userRole, 'confirmation', confirmations);
  res.json({
    success: true,
    data: filtered,
    total: filtered.length
  });
});

router.get('/:id', requirePermission('canRead', 'confirmation'), (req, res) => {
  const confirmation = getConfirmation(req.params.id);
  if (!confirmation) {
    return res.status(404).json({ success: false, error: '确认单不存在', code: 'NOT_FOUND' });
  }
  res.json({
    success: true,
    data: filterFields(req.userRole, 'confirmation', confirmation)
  });
});

router.post('/:id/approve', requirePermission('canApprove', 'confirmation'), (req, res) => {
  const { approvalNotes } = req.body;
  const result = approveConfirmation(req.params.id, approvalNotes || '', req.user.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

module.exports = router;
