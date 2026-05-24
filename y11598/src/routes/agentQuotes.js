const express = require('express');
const router = express.Router();
const {
  createAgentQuote,
  batchCreateAgentQuotes,
  getAgentQuoteById,
  getAgentQuotesByKbId,
  getAgentQuotesByAgentId,
  getAgentQuotes,
  getQuoteStatsByKbId,
} = require('../models/agentQuote');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

router.post('/', (req, res) => {
  try {
    const data = req.body;
    const id = createAgentQuote(data);

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
    const { records, operator } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'records must be an array',
      });
    }

    const startTime = Date.now();
    const ids = batchCreateAgentQuotes(records);
    const durationMs = Date.now() - startTime;

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'agent_quote_batch',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `批量导入客服引用记录 ${records.length} 条`,
      record_count: records.length,
      duration_ms: durationMs,
    });

    res.status(201).json({
      success: true,
      data: { count: ids.length, ids },
    });
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'agent_quote_batch',
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
    const record = getAgentQuoteById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Agent quote record not found',
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

router.get('/kb/:kbArticleId', (req, res) => {
  try {
    const filters = {};
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getAgentQuotesByKbId(req.params.kbArticleId, filters);
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

router.get('/kb/:kbArticleId/stats', (req, res) => {
  try {
    const filters = {};
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;

    const stats = getQuoteStatsByKbId(req.params.kbArticleId, filters);
    res.json({
      success: true,
      data: stats || {},
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/agent/:agentId', (req, res) => {
  try {
    const filters = {};
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getAgentQuotesByAgentId(req.params.agentId, filters);
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
    if (req.query.order_no) filters.order_no = req.query.order_no;
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getAgentQuotes(filters);
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
