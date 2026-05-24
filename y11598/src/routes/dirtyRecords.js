const express = require('express');
const router = express.Router();
const {
  getDirtyRecords,
  getDirtyRecordById,
  getDirtyRecordStats,
  handleDirtyRecord,
  DIRTY_TYPES,
  SEVERITY_LEVELS,
  HANDLE_STATUSES,
} = require('../models/dirtyRecord');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      dirty_types: DIRTY_TYPES,
      severity_levels: SEVERITY_LEVELS,
      handle_statuses: HANDLE_STATUSES,
    },
  });
});

router.get('/stats', (req, res) => {
  try {
    const stats = getDirtyRecordStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const record = getDirtyRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Dirty record not found',
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
    if (req.query.dirty_type) filters.dirty_type = req.query.dirty_type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.severity) filters.severity = req.query.severity;
    if (req.query.source_table) filters.source_table = req.query.source_table;
    if (req.query.source_id) filters.source_id = req.query.source_id;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getDirtyRecords(filters);
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

router.post('/:id/handle', (req, res) => {
  try {
    const { handler, handle_opinion, status } = req.body;
    const record = handleDirtyRecord(
      req.params.id,
      handler,
      handle_opinion,
      status || 'fixed'
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Dirty record not found',
      });
    }

    createAuditTrail({
      action_type: ACTION_TYPES.DIRTY_HANDLE,
      action_subtype: status || 'fixed',
      operator: handler || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `处理脏记录 ${req.params.id}: ${handle_opinion || ''}`,
    });

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

module.exports = router;
