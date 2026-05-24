const express = require('express');
const router = express.Router();
const { createAcceptanceEmail, getAcceptanceEmail, reviewAcceptanceEmail, listAcceptanceEmails } = require('../models/AcceptanceEmail');
const { filterFields, filterList, requirePermission } = require('../middleware/auth');

router.post('/', requirePermission('canCreate', 'acceptanceEmail'), (req, res) => {
  const result = createAcceptanceEmail(req.body, req.user.id);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  const filteredData = filterFields(req.userRole, 'acceptanceEmail', result.data);
  res.json({
    ...result,
    data: filteredData
  });
});

router.get('/', requirePermission('canRead', 'acceptanceEmail'), (req, res) => {
  const emails = listAcceptanceEmails(req.query);
  const filtered = filterList(req.userRole, 'acceptanceEmail', emails);
  res.json({
    success: true,
    data: filtered,
    total: filtered.length
  });
});

router.get('/:id', requirePermission('canRead', 'acceptanceEmail'), (req, res) => {
  const email = getAcceptanceEmail(req.params.id);
  if (!email) {
    return res.status(404).json({ success: false, error: '验收邮件不存在', code: 'NOT_FOUND' });
  }
  res.json({
    success: true,
    data: filterFields(req.userRole, 'acceptanceEmail', email)
  });
});

router.post('/:id/review', requirePermission('canReview', 'acceptanceEmail'), (req, res) => {
  const { result, reviewNotes } = req.body;
  const reviewResult = reviewAcceptanceEmail(req.params.id, result, reviewNotes, req.user.id);
  
  if (!reviewResult.success) {
    return res.status(400).json(reviewResult);
  }
  
  res.json(reviewResult);
});

module.exports = router;
