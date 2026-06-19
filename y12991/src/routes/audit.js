const express = require('express');
const router = express.Router();
const auditDao = require('../dao/auditDao');

router.get('/', async (req, res) => {
  try {
    const { entity_type, action, operator, limit } = req.query;
    const filters = {};
    if (entity_type) filters.entity_type = entity_type;
    if (action) filters.action = action;
    if (operator) filters.operator = operator;
    if (limit) filters.limit = parseInt(limit);

    const logs = await auditDao.listAuditLogs(filters);
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('查询审计日志失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const logs = await auditDao.getAuditLogsByEntity(
      req.params.entityType,
      req.params.entityId
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('查询实体审计日志失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/operator/:operator', async (req, res) => {
  try {
    const logs = await auditDao.getAuditLogsByOperator(req.params.operator);
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('查询操作人审计日志失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
