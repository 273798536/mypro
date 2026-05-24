const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');
const auditService = require('../services/auditService');

function getOperator(req) {
  return {
    userId: req.headers['x-user-id'] || 'anonymous',
    userName: req.headers['x-user-name'] || '匿名用户',
    role: req.headers['x-user-role'] || 'UNKNOWN'
  };
}

router.get('/change-orders', async (req, res) => {
  try {
    const { status, startTime, endTime, applicantId, knowledgeId, desensitize = 'true', format = 'json' } = req.query;
    
    const data = await exportService.exportChangeOrders({
      status,
      startTime,
      endTime,
      applicantId,
      knowledgeId,
      desensitize: desensitize === 'true',
      format
    });

    const operator = getOperator(req);
    await auditService.createAuditLog({
      entityType: 'CONFIG',
      entityId: 'export-change-orders',
      action: 'EXPORT',
      operatorId: operator.userId,
      operatorName: operator.userName,
      operatorRole: operator.role,
      changeReason: '导出变更单数据',
      isSensitive: desensitize !== 'true',
      riskLevel: desensitize !== 'true' ? 'HIGH' : 'LOW'
    });

    if (format === 'csv') {
      const csv = exportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=change-orders.csv');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reference-records', async (req, res) => {
  try {
    const { knowledgeId, agentId, isOfflineContent, isErrorClaim, startTime, endTime, desensitize = 'true', format = 'json' } = req.query;
    
    const data = await exportService.exportReferenceRecords({
      knowledgeId,
      agentId,
      isOfflineContent: isOfflineContent === 'true',
      isErrorClaim: isErrorClaim === 'true',
      startTime,
      endTime,
      desensitize: desensitize === 'true',
      format
    });

    const operator = getOperator(req);
    await auditService.createAuditLog({
      entityType: 'CONFIG',
      entityId: 'export-reference-records',
      action: 'EXPORT',
      operatorId: operator.userId,
      operatorName: operator.userName,
      operatorRole: operator.role,
      changeReason: '导出客服引用记录',
      isSensitive: desensitize !== 'true',
      riskLevel: desensitize !== 'true' ? 'HIGH' : 'LOW'
    });

    if (format === 'csv') {
      const csv = exportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reference-records.csv');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const { entityType, operatorId, operatorRole, action, startTime, endTime, desensitize = 'true', format = 'json' } = req.query;
    
    const data = await exportService.exportAuditLogs({
      entityType,
      operatorId,
      operatorRole,
      action,
      startTime,
      endTime,
      desensitize: desensitize === 'true',
      format
    });

    if (format === 'csv') {
      const csv = exportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/report', async (req, res) => {
  try {
    const { reportType, startTime, endTime, desensitize = 'true' } = req.query;
    
    const report = await exportService.generateReport({
      reportType,
      startTime,
      endTime,
      desensitize: desensitize === 'true'
    });

    const operator = getOperator(req);
    await auditService.createAuditLog({
      entityType: 'CONFIG',
      entityId: 'generate-report',
      action: 'EXPORT',
      operatorId: operator.userId,
      operatorName: operator.userName,
      operatorRole: operator.role,
      changeReason: '生成运营报告',
      isSensitive: false,
      riskLevel: 'LOW'
    });

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
