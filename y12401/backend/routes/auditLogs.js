const express = require('express');
const prisma = require('../prisma/client');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { entityType, entityId, operator, page = 1, pageSize = 50 } = req.query;
    const where = {};
    
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (operator) where.operator = { contains: operator };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { operationTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize),
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { operationTime: 'desc' },
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
