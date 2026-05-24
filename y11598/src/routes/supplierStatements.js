const express = require('express');
const router = express.Router();
const {
  createSupplierStatement,
  batchCreateSupplierStatements,
  getSupplierStatementById,
  getSupplierStatements,
  updateSupplierStatement,
  getStatementSummary,
} = require('../models/supplierStatement');
const { createDataVersion, RECORD_TYPES } = require('../models/dataVersion');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

router.post('/', (req, res) => {
  try {
    const data = req.body;
    const id = createSupplierStatement(data);

    createDataVersion(
      RECORD_TYPES.SUPPLIER_STATEMENT,
      id,
      data,
      req.body.operator || 'system',
      '创建对账单'
    );

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
    const { statements, operator } = req.body;
    if (!Array.isArray(statements)) {
      return res.status(400).json({
        success: false,
        error: 'statements must be an array',
      });
    }

    const startTime = Date.now();
    const ids = batchCreateSupplierStatements(statements);
    const durationMs = Date.now() - startTime;

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'supplier_statement_batch',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `批量导入供应商对账单 ${statements.length} 条`,
      record_count: statements.length,
      duration_ms: durationMs,
    });

    res.status(201).json({
      success: true,
      data: { count: ids.length, ids },
    });
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'supplier_statement_batch',
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
    const record = getSupplierStatementById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Supplier statement not found',
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
    if (req.query.supplier_id) filters.supplier_id = req.query.supplier_id;
    if (req.query.kb_article_id) filters.kb_article_id = req.query.kb_article_id;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getSupplierStatements(filters);
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

router.get('/summary', (req, res) => {
  try {
    const filters = {};
    if (req.query.supplier_id) filters.supplier_id = req.query.supplier_id;
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;

    const summary = getStatementSummary(filters);
    res.json({
      success: true,
      data: summary,
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
    const { operator, change_reason, ...updates } = req.body;
    const existing = getSupplierStatementById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Supplier statement not found',
      });
    }

    const record = updateSupplierStatement(req.params.id, updates);

    createDataVersion(
      RECORD_TYPES.SUPPLIER_STATEMENT,
      req.params.id,
      record,
      operator || 'system',
      change_reason || '更新对账单'
    );

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_UPDATE,
      action_subtype: 'supplier_statement',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `更新供应商对账单 ${req.params.id}`,
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
