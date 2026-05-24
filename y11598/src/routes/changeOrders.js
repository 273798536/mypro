const express = require('express');
const router = express.Router();
const {
  createChangeOrder,
  batchCreateChangeOrders,
  getChangeOrderById,
  getChangeOrderByNo,
  getChangeOrders,
  updateChangeOrder,
} = require('../models/changeOrder');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

router.post('/', (req, res) => {
  try {
    const data = req.body;
    const id = createChangeOrder(data);

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
    const { orders, operator } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        error: 'orders must be an array',
      });
    }

    const startTime = Date.now();
    const ids = batchCreateChangeOrders(orders);
    const durationMs = Date.now() - startTime;

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'change_order_batch',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `批量导入变更单 ${orders.length} 条`,
      record_count: orders.length,
      duration_ms: durationMs,
    });

    res.status(201).json({
      success: true,
      data: { count: ids.length, ids },
    });
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'change_order_batch',
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
    const record = getChangeOrderById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Change order not found',
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
    const { version } = req.query;
    const record = getChangeOrderByNo(req.params.orderNo, version);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Change order not found',
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
    if (req.query.status) filters.status = req.query.status;
    if (req.query.submitter) filters.submitter = req.query.submitter;
    if (req.query.kb_article_id) filters.kb_article_id = req.query.kb_article_id;
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getChangeOrders(filters);
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

router.put('/:id', (req, res) => {
  try {
    const { operator, ...updates } = req.body;
    const record = updateChangeOrder(req.params.id, updates);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Change order not found',
      });
    }

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_UPDATE,
      action_subtype: 'change_order',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `更新变更单 ${req.params.id}`,
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
