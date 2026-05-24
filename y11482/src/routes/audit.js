const express = require('express');
const router = express.Router();
const AuditService = require('../services/auditService');
const { OPERATION_TYPES } = require('../constants');

router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit } = req.query;
    const logs = await AuditService.getEntityLogs(
      entityType,
      entityId,
      limit ? parseInt(limit) : 100
    );
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/operation/:operationType', async (req, res) => {
  try {
    const { operationType } = req.params;
    const { startTime, endTime, limit } = req.query;
    const logs = await AuditService.getLogsByOperation(
      operationType,
      startTime,
      endTime,
      limit ? parseInt(limit) : 1000
    );
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/compare', async (req, res) => {
  try {
    const { entityType, entityId, fromLogId, toLogId } = req.body;
    const diff = await AuditService.compareVersions(
      entityType,
      entityId,
      fromLogId,
      toLogId
    );
    res.json({
      success: true,
      data: diff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/operation-types', (req, res) => {
  res.json({
    success: true,
    data: OPERATION_TYPES
  });
});

module.exports = router;
