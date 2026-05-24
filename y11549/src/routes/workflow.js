const express = require('express');
const workflowService = require('../services/workflowService');
const logger = require('../config/logger');

const router = express.Router();

router.post('/:recordType/:id/submit', async (req, res) => {
  try {
    const { recordType, id } = req.params;
    const { operator, operatorRole } = req.body;

    const result = await workflowService.submit(
      recordType,
      parseInt(id),
      operator,
      operatorRole
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('提交失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:recordType/:id/reject', async (req, res) => {
  try {
    const { recordType, id } = req.params;
    const { operator, operatorRole, reason } = req.body;

    const result = await workflowService.reject(
      recordType,
      parseInt(id),
      operator,
      operatorRole,
      reason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('驳回失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:recordType/:id/confirm', async (req, res) => {
  try {
    const { recordType, id } = req.params;
    const { operator, operatorRole, reason } = req.body;

    const result = await workflowService.confirm(
      recordType,
      parseInt(id),
      operator,
      operatorRole,
      reason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('确认失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:recordType/:id/freeze', async (req, res) => {
  try {
    const { recordType, id } = req.params;
    const { operator, operatorRole, reason } = req.body;

    const result = await workflowService.freeze(
      recordType,
      parseInt(id),
      operator,
      operatorRole,
      reason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('冻结失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:recordType/:id/withdraw', async (req, res) => {
  try {
    const { recordType, id } = req.params;
    const { operator, operatorRole, reason } = req.body;

    const result = await workflowService.withdraw(
      recordType,
      parseInt(id),
      operator,
      operatorRole,
      reason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('撤回失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
