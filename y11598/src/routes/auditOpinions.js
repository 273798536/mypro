const express = require('express');
const router = express.Router();
const {
  createAuditOpinion,
  batchCreateAuditOpinions,
  getAuditOpinionById,
  getAuditOpinionsByOrderNo,
  getAuditOpinionsByChangeOrderId,
  getAuditOpinions,
} = require('../models/auditOpinion');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

router.post('/', (req, res) => {
  try {
    const data = req.body;
    const id = createAuditOpinion(data);

    res.status(201).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/batch', (req, res) => {
  try {
    const { opinions, operator } = req.body;
    if (!Array.isArray(opinions)) {
      return res.status(400).json({
        success: false,
        error: 'opinions must be an array',
      });
    }

    const startTime = Date.now();
    const ids = batchCreateAuditOpinions(opinions);
    const durationMs = Date.now() - startTime;

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'audit_opinion_batch',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `批量导入审核意见 ${opinions.length} 条`,
      record_count: opinions.length,
      duration_ms: durationMs,
    });

    res.status(201).json({
      success: true,
      data: { count: ids.length, ids },
    });
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'audit_opinion_batch',
      operator: req.body.operator || 'system',
      status: ACTION_STATUSES.FAILED,
      error_message: error.message,
    });

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const record = getAuditOpinionById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Audit opinion not found',
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

router.get('/order-no/:orderNo', (req, res) => {
  try {
    const records = getAuditOpinionsByOrderNo(req.params.orderNo);
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

router.get('/change-order/:changeOrderId', (req, res) => {
  try {
    const records = getAuditOpinionsByChangeOrderId(req.params.changeOrderId);
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

router.get('/', (req, res) => {
  try {
    const filters = {};
    if (req.query.auditor) filters.auditor = req.query.auditor;
    if (req.query.result) filters.result = req.query.result;
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getAuditOpinions(filters);
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
