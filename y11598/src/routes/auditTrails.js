const express = require('express');
const router = express.Router();
const {
  getAuditTrails,
  getAuditTrailById,
  ACTION_TYPES,
  ACTION_STATUSES,
} = require('../models/auditTrail');

router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      action_types: ACTION_TYPES,
      statuses: ACTION_STATUSES,
    },
  });
});

router.get('/:id', (req, res) => {
  try {
    const record = getAuditTrailById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Audit trail not found',
      });
    }
    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/', (req, res) => {
  try {
    const filters = {};
    if (req.query.action_type) filters.action_type = req.query.action_type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getAuditTrails(filters);
    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
