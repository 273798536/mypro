const express = require('express');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAuditLogs, getAuditStats } = require('../services/auditService');

const router = express.Router();

router.get('/logs', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, userId, module, action, startDate, endDate } = req.query;
    
    const logs = await getAuditLogs(
      { userId, module, action, startDate, endDate },
      parseInt(page),
      parseInt(pageSize)
    );
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    const { module, startDate, endDate } = req.query;
    
    const stats = await getAuditStats({ module, startDate, endDate });
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
