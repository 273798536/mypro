const express = require('express');
const cors = require('cors');
const prisma = require('./prisma/client');

const invoicesRouter = require('./routes/invoices');
const paymentPlansRouter = require('./routes/paymentPlans');
const discountRulesRouter = require('./routes/discountRules');
const discountQuotesRouter = require('./routes/discountQuotes');
const auditLogsRouter = require('./routes/auditLogs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '供应商动态折扣报价系统 API 运行正常', timestamp: new Date() });
});

app.use('/api/invoices', invoicesRouter);
app.use('/api/payment-plans', paymentPlansRouter);
app.use('/api/discount-rules', discountRulesRouter);
app.use('/api/discount-quotes', discountQuotesRouter);
app.use('/api/audit-logs', auditLogsRouter);

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 API 文档:`);
  console.log(`   GET  /api/health - 健康检查`);
  console.log(`   GET  /api/invoices - 发票列表`);
  console.log(`   GET  /api/payment-plans - 付款计划列表`);
  console.log(`   GET  /api/discount-rules - 折扣规则列表`);
  console.log(`   GET  /api/discount-quotes - 折扣报价列表`);
  console.log(`   POST /api/discount-quotes/calculate - 折扣试算`);
  console.log(`   GET  /api/audit-logs - 审计日志`);
});

process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});
