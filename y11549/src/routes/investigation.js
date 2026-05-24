const express = require('express');
const investigationService = require('../services/investigationService');
const auditService = require('../services/auditService');
const logger = require('../config/logger');

const router = express.Router();

router.get('/chain/:borrowRecordId', async (req, res) => {
  try {
    const chain = await investigationService.buildInvestigationChain(
      parseInt(req.params.borrowRecordId)
    );
    res.json({ success: true, data: chain });
  } catch (error) {
    logger.error('获取追责链失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/chain/:borrowRecordId', async (req, res) => {
  try {
    const { borrowRecordId } = req.params;
    const { handler, handlerRole, action, decision, evidence, changeReason } = req.body;

    const result = await investigationService.addManualInvestigationStep(
      parseInt(borrowRecordId),
      handler,
      handlerRole,
      action,
      decision,
      evidence,
      changeReason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('添加调查步骤失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:borrowRecordId/status', async (req, res) => {
  try {
    const { borrowRecordId } = req.params;
    const { status, responsiblePerson, operator, operatorRole, changeReason } = req.body;

    const result = await investigationService.updateBorrowStatus(
      parseInt(borrowRecordId),
      status,
      responsiblePerson,
      operator,
      operatorRole,
      changeReason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('更新状态失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/lost-items', async (req, res) => {
  try {
    const { status, department, startDate, endDate } = req.query;
    const records = await investigationService.getLostItemsInvestigation({
      status,
      department,
      startDate,
      endDate
    });
    res.json({ success: true, data: records });
  } catch (error) {
    logger.error('获取遗失物品列表失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/summary/responsibility', async (req, res) => {
  try {
    const summary = await investigationService.getResponsibilitySummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('获取责任汇总失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/audit/:recordType/:recordId', async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    const auditTrail = await auditService.getAuditTrail(recordType, parseInt(recordId));
    res.json({ success: true, data: auditTrail });
  } catch (error) {
    logger.error('获取审计日志失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
