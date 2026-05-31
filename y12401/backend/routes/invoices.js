const express = require('express');
const prisma = require('../prisma/client');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

router.use(auditMiddleware('INVOICE'));

router.get('/', async (req, res) => {
  try {
    const { status, supplierName, page = 1, pageSize = 20 } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (supplierName) where.supplierName = { contains: supplierName };

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        paymentPlan: true,
        discountQuotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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

    const total = await prisma.invoice.count({ where });

    res.json({
      success: true,
      data: invoices,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        paymentPlan: true,
        discountQuotes: {
          include: {
            discountRule: true,
            quoteHistories: { orderBy: { operationTime: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: { orderBy: { operationTime: 'desc' } },
        redInvoice: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '发票不存在' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const invoice = await prisma.invoice.create({
      data: {
        ...req.body,
        amount: parseFloat(req.body.amount),
        taxAmount: parseFloat(req.body.taxAmount),
        totalAmount: parseFloat(req.body.totalAmount),
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
      },
    });

    await req.audit.log('CREATE', null, invoice, '创建发票', req.body.sourceType, req.body.sourceId);

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/red冲', async (req, res) => {
  try {
    const { id } = req.params;
    const { redInvoiceNo, remark, sourceType, sourceId } = req.body;

    const originalInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { discountQuotes: true },
    });

    if (!originalInvoice) {
      return res.status(404).json({ success: false, message: '原发票不存在' });
    }

    if (originalInvoice.status === 'RED_INVOICED') {
      return res.status(400).json({ success: false, message: '该发票已红冲，不能重复操作' });
    }

    if (originalInvoice.status === 'PAID') {
      return res.status(400).json({ success: false, message: '已付款发票不能红冲' });
    }

    const hasActiveQuotes = originalInvoice.discountQuotes.some(
      (q) => ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(q.status)
    );

    if (hasActiveQuotes) {
      return res.status(400).json({
        success: false,
        message: '该发票存在未完成的折扣报价，请先处理后再红冲',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const redInvoice = await tx.invoice.create({
        data: {
          invoiceNo: redInvoiceNo || `RED-${originalInvoice.invoiceNo}`,
          supplierName: originalInvoice.supplierName,
          amount: -originalInvoice.amount,
          taxAmount: -originalInvoice.taxAmount,
          totalAmount: -originalInvoice.totalAmount,
          invoiceDate: new Date(),
          dueDate: originalInvoice.dueDate,
          status: 'RED_INVOICED',
          paymentPlanId: null,
        },
      });

      const updatedOriginal = await tx.invoice.update({
        where: { id },
        data: {
          status: 'RED_INVOICED',
          redInvoiceId: redInvoice.id,
        },
      });

      await tx.discountQuote.updateMany({
        where: { invoiceId: id, status: { in: ['DRAFT', 'SUBMITTED'] } },
        data: { status: 'INVALID' },
      });

      const relatedQuotes = await tx.discountQuote.findMany({
        where: { invoiceId: id },
      });

      for (const quote of relatedQuotes) {
        await tx.quoteHistory.create({
          data: {
            quoteId: quote.id,
            fieldName: 'status',
            oldValue: quote.status,
            newValue: 'INVALID',
            operationType: 'RED冲_INVALID',
            operator: req.headers['x-operator'] || 'system',
            remark: `发票红冲，报价自动作废: ${remark || ''}`,
            sourceType: sourceType || 'INVOICE_RED冲',
            sourceId: sourceId || id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: 'INVOICE',
          entityId: id,
          operationType: 'RED冲',
          oldValue: JSON.stringify(originalInvoice),
          newValue: JSON.stringify(updatedOriginal),
          operator: req.headers['x-operator'] || 'system',
          remark: `发票红冲，关联红冲发票: ${redInvoice.invoiceNo}。${remark || ''}`,
          sourceType: sourceType || 'INVOICE_RED冲',
          sourceId: sourceId || redInvoice.id,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'INVOICE',
          entityId: redInvoice.id,
          operationType: 'CREATE_RED冲',
          oldValue: null,
          newValue: JSON.stringify(redInvoice),
          operator: req.headers['x-operator'] || 'system',
          remark: `红冲发票，对应原发票: ${originalInvoice.invoiceNo}`,
          sourceType: sourceType || 'INVOICE_RED冲',
          sourceId: sourceId || id,
        },
      });

      return { originalInvoice: updatedOriginal, redInvoice };
    });

    res.json({
      success: true,
      data: result,
      message: '发票红冲成功，相关报价已自动作废',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/trace', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        paymentPlan: true,
        discountQuotes: {
          include: {
            discountRule: true,
            quoteHistories: { orderBy: { operationTime: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: { orderBy: { operationTime: 'desc' } },
        redInvoice: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '发票不存在' });
    }

    const traceChain = {
      invoice: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        sourceType: invoice.paymentPlan?.sourceType,
        sourceId: invoice.paymentPlan?.sourceId,
      },
      paymentPlan: invoice.paymentPlan
        ? {
            id: invoice.paymentPlan.id,
            planNo: invoice.paymentPlan.planNo,
            sourceType: invoice.paymentPlan.sourceType,
            sourceId: invoice.paymentPlan.sourceId,
          }
        : null,
      discountQuotes: invoice.discountQuotes.map((q) => ({
        id: q.id,
        quoteNo: q.quoteNo,
        sourceType: q.sourceType,
        sourceId: q.sourceId,
        status: q.status,
        histories: q.quoteHistories.map((h) => ({
          field: h.fieldName,
          oldValue: h.oldValue,
          newValue: h.newValue,
          operation: h.operationType,
          operator: h.operator,
          time: h.operationTime,
          sourceType: h.sourceType,
          sourceId: h.sourceId,
        })),
      })),
      auditLogs: invoice.auditLogs.map((log) => ({
        operation: log.operationType,
        operator: log.operator,
        time: log.operationTime,
        remark: log.remark,
        sourceType: log.sourceType,
        sourceId: log.sourceId,
      })),
      redInvoice: invoice.redInvoice
        ? {
            id: invoice.redInvoice.id,
            invoiceNo: invoice.redInvoice.invoiceNo,
          }
        : null,
    };

    res.json({ success: true, data: traceChain });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
