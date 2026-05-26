const express = require('express');
const router = express.Router();
const {
  createApprovalEmail,
  batchCreateApprovalEmails,
  getApprovalEmailById,
  getApprovalEmailsByOrderNo,
  getApprovalEmailsByChangeOrderId,
  getApprovalEmails,
} = require('../models/approvalEmail');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

router.post('/', (req, res) => {
  try {
    const data = req.body;
    const id = createApprovalEmail(data);

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
    const { emails, operator } = req.body;
    if (!Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'emails must be an array',
      });
    }

    const startTime = Date.now();
    const ids = batchCreateApprovalEmails(emails);
    const durationMs = Date.now() - startTime;

    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'approval_email_batch',
      operator: operator || 'system',
      status: ACTION_STATUSES.SUCCESS,
      detail: `批量导入审批邮件 ${emails.length} 条`,
      record_count: emails.length,
      duration_ms: durationMs,
    });

    res.status(201).json({
      success: true,
      data: { count: ids.length, ids },
    });
  } catch (error) {
    createAuditTrail({
      action_type: ACTION_TYPES.DATA_IMPORT,
      action_subtype: 'approval_email_batch',
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
    const record = getApprovalEmailById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Approval email not found',
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
    const records = getApprovalEmailsByOrderNo(req.params.orderNo);
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
    const records = getApprovalEmailsByChangeOrderId(req.params.changeOrderId);
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
    if (req.query.email_from) filters.email_from = req.query.email_from;
    if (req.query.approval_result) filters.approval_result = req.query.approval_result;
    if (req.query.start_time) filters.start_time = req.query.start_time;
    if (req.query.end_time) filters.end_time = req.query.end_time;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const records = getApprovalEmails(filters);
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
