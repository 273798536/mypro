const express = require('express');
const prisma = require('../prisma/client');
const { auditMiddleware, createQuoteHistory } = require('../middleware/audit');
const {
  calculateDiscount,
  calculateAdvanceDays,
  findMatchingRule,
  generateQuoteNo,
} = require('../utils/calculator');
const dayjs = require('dayjs');

const router = express.Router();

router.use(auditMiddleware('DISCOUNT_QUOTE'));

router.post('/calculate', async (req, res) => {
  try {
    const { invoiceId, proposedPayDate, discountRate: manualRate, sourceType, sourceId } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { paymentPlan: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '发票不存在' });
    }

    if (invoice.status === 'RED_INVOICED') {
      return res.status(400).json({
        success: false,
        message: '红冲发票不能进行折扣试算',
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: '已付款发票不能进行折扣试算',
      });
    }

    const advanceDays = calculateAdvanceDays(invoice.dueDate, proposedPayDate);

    if (advanceDays <= 0) {
      return res.status(400).json({
        success: false,
        message: '拟付款日期必须早于发票到期日',
        advanceDays,
      });
    }

    let discountRate = manualRate;
    let matchingRule = null;

    if (!discountRate) {
      const activeRules = await prisma.discountRule.findMany({
        where: {
          isActive: true,
          effectiveFrom: { lte: new Date() },
          effectiveTo: { gte: new Date() },
        },
      });

      matchingRule = findMatchingRule(activeRules, advanceDays, invoice.supplierName);
      if (matchingRule) {
        discountRate = matchingRule.discountRate;
      }
    }

    if (!discountRate) {
      return res.status(400).json({
        success: false,
        message: '未找到匹配的折扣规则，请手动指定折扣率',
        advanceDays,
      });
    }

    const calculations = calculateDiscount(
      parseFloat(invoice.totalAmount),
      parseFloat(discountRate),
      advanceDays
    );

    const result = {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      supplierName: invoice.supplierName,
      originalAmount: parseFloat(invoice.totalAmount),
      originalDueDate: invoice.dueDate,
      proposedPayDate: new Date(proposedPayDate),
      advanceDays,
      discountRate: parseFloat(discountRate),
      discountRuleId: matchingRule?.id || null,
      discountRuleName: matchingRule?.ruleName || '手动指定',
      ...calculations,
      calculationTrace: {
        sourceType: sourceType || 'MANUAL_CALCULATION',
        sourceId: sourceId || `CALC_${Date.now()}`,
        formula: `折扣金额 = 发票金额 × 折扣率 = ${invoice.totalAmount} × ${discountRate} = ${calculations.discountAmount}`,
        savingTrace: `节省金额 = 折扣金额 = ${calculations.savingAmount}`,
        advanceDaysTrace: `提前天数 = 到期日 - 拟付款日 = ${dayjs(invoice.dueDate).format('YYYY-MM-DD')} - ${dayjs(proposedPayDate).format('YYYY-MM-DD')} = ${advanceDays}天`,
      },
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, supplierName, invoiceId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (supplierName) where.supplierName = { contains: supplierName };
    if (invoiceId) where.invoiceId = invoiceId;

    const quotes = await prisma.discountQuote.findMany({
      where,
      include: {
        invoice: true,
        paymentPlan: true,
        discountRule: true,
        quoteHistories: {
          orderBy: { operationTime: 'desc' },
          take: 10,
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

    const total = await prisma.discountQuote.count({ where });

    res.json({
      success: true,
      data: quotes,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quote = await prisma.discountQuote.findUnique({
      where: { id: req.params.id },
      include: {
        invoice: {
          include: { paymentPlan: true, redInvoice: true },
        },
        paymentPlan: true,
        discountRule: true,
        quoteHistories: {
          orderBy: { operationTime: 'desc' },
        },
        auditLogs: {
          orderBy: { operationTime: 'desc' },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      invoiceId,
      paymentPlanId,
      proposedPayDate,
      discountRate,
      discountRuleId,
      sourceType,
      sourceId,
      createdBy,
      remark,
    } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { discountQuotes: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '发票不存在' });
    }

    if (invoice.status === 'RED_INVOICED') {
      return res.status(400).json({
        success: false,
        message: '红冲发票不能创建折扣报价',
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: '已付款发票不能创建折扣报价',
      });
    }

    const hasActiveQuotes = invoice.discountQuotes.some(
      (q) => ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(q.status)
    );

    if (hasActiveQuotes) {
      return res.status(400).json({
        success: false,
        message: '该发票已有未完成的折扣报价，不能重复创建',
      });
    }

    const advanceDays = calculateAdvanceDays(invoice.dueDate, proposedPayDate);
    const calculations = calculateDiscount(
      parseFloat(invoice.totalAmount),
      parseFloat(discountRate),
      advanceDays
    );

    const quoteNo = generateQuoteNo();

    const quote = await prisma.discountQuote.create({
      data: {
        quoteNo,
        invoiceId,
        paymentPlanId: paymentPlanId || invoice.paymentPlanId,
        discountRuleId,
        supplierName: invoice.supplierName,
        originalAmount: parseFloat(invoice.totalAmount),
        discountRate: parseFloat(discountRate),
        discountAmount: calculations.discountAmount,
        actualPayAmount: calculations.actualPayAmount,
        savingAmount: calculations.savingAmount,
        originalDueDate: invoice.dueDate,
        proposedPayDate: new Date(proposedPayDate),
        advanceDays,
        status: 'DRAFT',
        sourceType: sourceType || 'DISCOUNT_QUOTE_CREATE',
        sourceId: sourceId || quoteNo,
        createdBy: createdBy || 'system',
      },
    });

    await createQuoteHistory(
      quote.id,
      'status',
      null,
      'DRAFT',
      'CREATE',
      createdBy || 'system',
      `创建折扣报价${remark ? ': ' + remark : ''}`,
      sourceType || 'DISCOUNT_QUOTE_CREATE',
      sourceId || quoteNo
    );

    await req.audit.log('CREATE', null, quote, `创建折扣报价${remark ? ': ' + remark : ''}`, sourceType, sourceId);

    res.json({
      success: true,
      data: quote,
      message: '折扣报价创建成功',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator, remark, sourceType, sourceId } = req.body;

    const quote = await prisma.discountQuote.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    if (quote.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `只有草稿状态的报价可以提交，当前状态: ${quote.status}`,
      });
    }

    if (quote.invoice.status === 'RED_INVOICED') {
      return res.status(400).json({
        success: false,
        message: '发票已红冲，报价不能提交',
      });
    }

    const updatedQuote = await prisma.discountQuote.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });

    await createQuoteHistory(
      id,
      'status',
      'DRAFT',
      'SUBMITTED',
      'SUBMIT',
      operator || 'system',
      `提交报价审批${remark ? ': ' + remark : ''}`,
      sourceType || quote.sourceType,
      sourceId || quote.sourceId
    );

    await req.audit.log(
      'SUBMIT',
      quote,
      updatedQuote,
      `提交报价审批${remark ? ': ' + remark : ''}`,
      sourceType,
      sourceId
    );

    res.json({
      success: true,
      data: updatedQuote,
      message: '报价已提交审批',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator, remark, sourceType, sourceId } = req.body;

    const quote = await prisma.discountQuote.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    if (quote.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: `只有已提交状态的报价可以审批，当前状态: ${quote.status}`,
      });
    }

    if (quote.invoice.status === 'RED_INVOICED') {
      return res.status(400).json({
        success: false,
        message: '发票已红冲，报价不能审批通过',
      });
    }

    const updatedQuote = await prisma.discountQuote.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: operator || 'system',
        approvedAt: new Date(),
      },
    });

    await createQuoteHistory(
      id,
      'status',
      'SUBMITTED',
      'APPROVED',
      'APPROVE',
      operator || 'system',
      `审批通过${remark ? ': ' + remark : ''}`,
      sourceType || quote.sourceType,
      sourceId || quote.sourceId
    );

    await req.audit.log(
      'APPROVE',
      quote,
      updatedQuote,
      `审批通过${remark ? ': ' + remark : ''}`,
      sourceType,
      sourceId
    );

    res.json({
      success: true,
      data: updatedQuote,
      message: '报价已审批通过',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator, remark, sourceType, sourceId, actualPayDate } = req.body;

    const quote = await prisma.discountQuote.findUnique({
      where: { id },
      include: { invoice: true, paymentPlan: true },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    if (quote.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `只有已审批状态的报价可以执行，当前状态: ${quote.status}`,
      });
    }

    if (quote.invoice.status === 'RED_INVOICED') {
      return res.status(400).json({
        success: false,
        message: '发票已红冲，报价不能执行',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedQuote = await tx.discountQuote.update({
        where: { id },
        data: { status: 'EXECUTED' },
      });

      await tx.invoice.update({
        where: { id: quote.invoiceId },
        data: { status: 'PAID' },
      });

      if (quote.paymentPlanId) {
        await tx.paymentPlan.update({
          where: { id: quote.paymentPlanId },
          data: {
            status: 'PAID',
            actualAmount: quote.actualPayAmount,
            actualDate: actualPayDate ? new Date(actualPayDate) : new Date(),
          },
        });
      }

      await createQuoteHistory(
        id,
        'status',
        'APPROVED',
        'EXECUTED',
        'EXECUTE',
        operator || 'system',
        `执行付款${remark ? ': ' + remark : ''}`,
        sourceType || quote.sourceType,
        sourceId || quote.sourceId
      );

      return updatedQuote;
    });

    await req.audit.log(
      'EXECUTE',
      quote,
      result,
      `执行付款${remark ? ': ' + remark : ''}`,
      sourceType,
      sourceId
    );

    res.json({
      success: true,
      data: result,
      message: '报价已执行，发票已标记为已付款',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator, remark, sourceType, sourceId } = req.body;

    const quote = await prisma.discountQuote.findUnique({ where: { id } });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    if (!['DRAFT', 'SUBMITTED'].includes(quote.status)) {
      return res.status(400).json({
        success: false,
        message: `当前状态 ${quote.status} 不能驳回`,
      });
    }

    const updatedQuote = await prisma.discountQuote.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await createQuoteHistory(
      id,
      'status',
      quote.status,
      'REJECTED',
      'REJECT',
      operator || 'system',
      `驳回报价${remark ? ': ' + remark : ''}`,
      sourceType || quote.sourceType,
      sourceId || quote.sourceId
    );

    await req.audit.log(
      'REJECT',
      quote,
      updatedQuote,
      `驳回报价${remark ? ': ' + remark : ''}`,
      sourceType,
      sourceId
    );

    res.json({
      success: true,
      data: updatedQuote,
      message: '报价已驳回',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { operator, remark, sourceType, sourceId } = req.body;

    const quote = await prisma.discountQuote.findUnique({ where: { id } });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    if (['EXECUTED', 'INVALID'].includes(quote.status)) {
      return res.status(400).json({
        success: false,
        message: `当前状态 ${quote.status} 不能取消`,
      });
    }

    const updatedQuote = await prisma.discountQuote.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await createQuoteHistory(
      id,
      'status',
      quote.status,
      'CANCELLED',
      'CANCEL',
      operator || 'system',
      `取消报价${remark ? ': ' + remark : ''}`,
      sourceType || quote.sourceType,
      sourceId || quote.sourceId
    );

    await req.audit.log(
      'CANCEL',
      quote,
      updatedQuote,
      `取消报价${remark ? ': ' + remark : ''}`,
      sourceType,
      sourceId
    );

    res.json({
      success: true,
      data: updatedQuote,
      message: '报价已取消',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/trace', async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await prisma.discountQuote.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { paymentPlan: true, redInvoice: true },
        },
        paymentPlan: true,
        discountRule: true,
        quoteHistories: {
          orderBy: { operationTime: 'desc' },
        },
        auditLogs: {
          orderBy: { operationTime: 'desc' },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: '报价不存在' });
    }

    const traceChain = {
      discountQuote: {
        id: quote.id,
        quoteNo: quote.quoteNo,
        sourceType: quote.sourceType,
        sourceId: quote.sourceId,
        createdBy: quote.createdBy,
      },
      source: {
        type: quote.sourceType,
        id: quote.sourceId,
      },
      invoice: quote.invoice
        ? {
            id: quote.invoice.id,
            invoiceNo: quote.invoice.invoiceNo,
            status: quote.invoice.status,
            paymentPlanId: quote.invoice.paymentPlanId,
          }
        : null,
      paymentPlan: quote.paymentPlan
        ? {
            id: quote.paymentPlan.id,
            planNo: quote.paymentPlan.planNo,
            sourceType: quote.paymentPlan.sourceType,
            sourceId: quote.paymentPlan.sourceId,
          }
        : null,
      discountRule: quote.discountRule
        ? {
            id: quote.discountRule.id,
            ruleName: quote.discountRule.ruleName,
          }
        : null,
      calculationTrace: {
        originalAmount: quote.originalAmount,
        discountRate: quote.discountRate,
        discountAmount: quote.discountAmount,
        actualPayAmount: quote.actualPayAmount,
        savingAmount: quote.savingAmount,
        advanceDays: quote.advanceDays,
        formula: `折扣金额 = ${quote.originalAmount} × ${quote.discountRate} = ${quote.discountAmount}`,
        savingFormula: `节省金额 = ${quote.savingAmount}`,
      },
      statusHistory: quote.quoteHistories.map((h) => ({
        field: h.fieldName,
        oldValue: h.oldValue,
        newValue: h.newValue,
        operation: h.operationType,
        operator: h.operator,
        time: h.operationTime,
        remark: h.remark,
        sourceType: h.sourceType,
        sourceId: h.sourceId,
      })),
      auditLogs: quote.auditLogs.map((log) => ({
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

router.get('/summary/total-savings', async (req, res) => {
  try {
    const { startDate, endDate, supplierName } = req.query;
    const where = { status: 'EXECUTED' };

    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    if (supplierName) where.supplierName = { contains: supplierName };

    const quotes = await prisma.discountQuote.findMany({
      where,
      include: { invoice: true },
    });

    const totalSaving = quotes.reduce((sum, q) => sum + parseFloat(q.savingAmount), 0);
    const totalCount = quotes.length;

    const bySupplier = quotes.reduce((acc, q) => {
      if (!acc[q.supplierName]) {
        acc[q.supplierName] = { totalSaving: 0, count: 0 };
      }
      acc[q.supplierName].totalSaving += parseFloat(q.savingAmount);
      acc[q.supplierName].count += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalSaving: Math.round(totalSaving * 100) / 100,
        totalCount,
        bySupplier,
        quotes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
