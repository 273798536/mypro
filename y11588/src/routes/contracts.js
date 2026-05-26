const express = require('express');
const router = express.Router();
const { createContract, getContract, updateContract, freezeContract, listContracts, getContractVersions } = require('../models/Contract');
const { filterFields, filterList, requirePermission } = require('../middleware/auth');

router.post('/', requirePermission('canCreate', 'contract'), (req, res) => {
  const result = createContract(req.body, req.user.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  const filteredData = filterFields(req.userRole, 'contract', result.data);
  res.json({
    ...result,
    data: filteredData
  });
});

router.get('/', requirePermission('canRead', 'contract'), (req, res) => {
  const contracts = listContracts(req.query);
  const filtered = filterList(req.userRole, 'contract', contracts);
  res.json({
    success: true,
    data: filtered,
    total: filtered.length
  });
});

router.get('/:id/versions', requirePermission('canRead', 'versionHistory'), (req, res) => {
  const versions = getContractVersions(req.params.id);
  res.json({
    success: true,
    data: versions
  });
});

router.post('/:id/freeze', requirePermission('canFreeze', 'contract'), (req, res) => {
  const result = freezeContract(req.params.id, req.user.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({
    ...result,
    data: filterFields(req.userRole, 'contract', result.data)
  });
});

router.get('/:id', requirePermission('canRead', 'contract'), (req, res) => {
  const contract = getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ success: false, error: '合同不存在', code: 'NOT_FOUND' });
  }
  res.json({
    success: true,
    data: filterFields(req.userRole, 'contract', contract)
  });
});

router.put('/:id', requirePermission('canUpdate', 'contract'), (req, res) => {
  const result = updateContract(req.params.id, req.body, req.user.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({
    ...result,
    data: filterFields(req.userRole, 'contract', result.data)
  });
});

module.exports = router;
