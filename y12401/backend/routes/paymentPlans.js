const express = require('express');
const prisma = require('../prisma/client');
const { auditMiddleware } = require('../middleware/audit');
const dayjs = require('dayjs');

const router = express.Router();

router.use(auditMiddleware('PAYMENT_PLAN'));

router.get('/', async (req, res) => {
  try {
    const { status, supplierName, page = 1, pageSize = 20 } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (supplierName) where.supplierName = { contains: supplierName };

    const plans = await prisma.paymentPlan.findMany({
      where,
      include: {
        invoices: true,
        discountQuotes: {
          where: { status: { not: 'INVALID' } },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { operationTime: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize),
    });

    const total = await prisma.paymentPlan.count({ where });

    res.json({
      success: true,
      data: plans,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: req.params.id },
      include: {
        invoices: true,
        discountQuotes: {
          include: {
            invoice: true,
            discountRule: true,
            quoteHistories: { orderBy: { operationTime: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: { orderBy: { operationTime: 'desc' } },
      },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: '付款计划不存在' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const plan = await prisma.paymentPlan.create({
      data: {
        ...req.body,
        plannedAmount: parseFloat(req.body.plannedAmount),
        plannedDate: new Date(req.body.plannedDate),
      },
    });

    await req.audit.log('CREATE', null, plan, '创建付款计划', req.body.sourceType, req.body.sourceId);

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newAmount, remark, sourceType, sourceId } = req.body;

    const originalPlan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: { invoices: true },
    });

    if (!originalPlan) {
      return res.status(404).json({ success: false, message: '付款计划不存在' });
    }

    const hasRed冲Invoice = originalPlan.invoices.some((inv) => inv.status === 'RED_INVOICED');
    if (hasRed冲Invoice && newDate) {
      const hasNormalInvoices = originalPlan.invoices.some((inv) => inv.status === 'NORMAL');
      if (!hasNormalInvoices) {
        return res.status(400).json({
          success: false,
          message: '该付款计划下所有发票已红冲，禁止顺延付款日',
        });
      }
    }

    const updateData = {};
    if (newDate) updateData.plannedDate = new Date(newDate);
    if (newAmount) updateData.plannedAmount = parseFloat(newAmount);
    updateData.status = 'ADJUSTED';

    const updatedPlan = await prisma.paymentPlan.update({
      where: { id },
      data: updateData,
    });

    await req.audit.log(
      'ADJUST',
      originalPlan,
      updatedPlan,
      `调整付款计划: ${remark || ''}`,
      sourceType,
      sourceId
    );

    res.json({
      success: true,
      data: updatedPlan,
      message: '付款计划调整成功',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/trace', async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: {
        invoices: true,
        discountQuotes: {
          include: {
            invoice: true,
            discountRule: true,
            quoteHistories: { orderBy: { operationTime: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: { orderBy: { operationTime: 'desc' } },
      },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: '付款计划不存在' });
    }

    const traceChain = {
      paymentPlan: {
        id: plan.id,
        planNo: plan.planNo,
        sourceType: plan.sourceType,
        sourceId: plan.sourceId,
      },
      source: {
        type: plan.sourceType,
        id: plan.sourceId,
      },
      invoices: plan.invoices.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        status: inv.status,
      })),
      discountQuotes: plan.discountQuotes.map((q) => ({
        id: q.id,
        quoteNo: q.quoteNo,
        sourceType: q.sourceType,
        sourceId: q.sourceId,
        status: q.status,
      })),
      auditLogs: plan.auditLogs.map((log) => ({
        operation: log.operationType,
        operator: log.operator,
        time: log.operationTime,
        remark: log.remark,
        sourceType: log.sourceType,
        sourceId: log.sourceId,
      })),
    };

    res.json({ success: true, data: traceChain });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
