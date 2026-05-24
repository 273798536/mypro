const express = require('express');
const router = express.Router();
const { listFailedRecords, addFailedRecord } = require('../models/Confirmation');
const { requirePermission } = require('../middleware/auth');

router.get('/', requirePermission('canRead', 'failedRecords'), (req, res) => {
  const records = listFailedRecords(req.query);
  res.json({
    success: true,
    data: records,
    total: records.length
  });
});

router.post('/', requirePermission('canCreate', 'failedRecords'), (req, res) => {
  const record = addFailedRecord(req.body, req.body.error || {}, req.user.id);
  res.json({
    success: true,
    data: record
  });
});

module.exports = router;
