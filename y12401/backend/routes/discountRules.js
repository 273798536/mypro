const express = require('express');
const prisma = require('../prisma/client');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

router.use(auditMiddleware('DISCOUNT_RULE'));

router.get('/', async (req, res) => {
  try {
    const { supplierName, isActive, page = 1, pageSize = 20 } = req.query;
    const where = {};
    
    if (supplierName) where.supplierName = { contains: supplierName };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await prisma.discountRule.findMany({
      where,
      include: {
        discountQuotes: { take: 5, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize),
    });

    const total = await prisma.discountRule.count({ where });

    res.json({
      success: true,
      data: rules,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/matching', async (req, res) => {
  try {
    const { supplierName, advanceDays } = req.query;

    const rules = await prisma.discountRule.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { supplierName: supplierName },
              { supplierName: '*' },
            ],
          },
          {
            minAdvanceDays: { lte: parseInt(advanceDays) },
            maxAdvanceDays: { gte: parseInt(advanceDays) },
          },
        ],
      },
    });

    rules.sort((a, b) => {
      if (a.supplierName === supplierName && b.supplierName !== supplierName) return -1;
      if (b.supplierName === supplierName && a.supplierName !== supplierName) return 1;
      return b.discountRate - a.discountRate;
    });

    res.json({ success: true, data: rules[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const rule = await prisma.discountRule.create({
      data: {
        ...req.body,
        discountRate: parseFloat(req.body.discountRate),
        minAdvanceDays: parseInt(req.body.minAdvanceDays),
        maxAdvanceDays: parseInt(req.body.maxAdvanceDays),
        effectiveFrom: new Date(req.body.effectiveFrom),
        effectiveTo: new Date(req.body.effectiveTo),
      },
    });

    await req.audit.log('CREATE', null, rule, '创建折扣规则', req.body.sourceType, req.body.sourceId);

    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
