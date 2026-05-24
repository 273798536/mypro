const express = require('express');
const { authMiddleware } = require('./middleware/auth');
const contractRoutes = require('./routes/contracts');
const paymentNodeRoutes = require('./routes/paymentNodes');
const acceptanceEmailRoutes = require('./routes/acceptanceEmails');
const confirmationRoutes = require('./routes/confirmations');
const exportRoutes = require('./routes/exports');
const failedRecordsRoutes = require('./routes/failedRecords');
const { getDB } = require('./models/storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(authMiddleware);

app.get('/health', (req, res) => {
  const db = getDB();
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      user: req.user,
      stats: {
        contracts: Object.keys(db.contracts).length,
        paymentNodes: Object.keys(db.paymentNodes).length,
        acceptanceEmails: Object.keys(db.acceptanceEmails).length,
        confirmations: Object.keys(db.confirmations).length,
        failedRecords: db.failedRecords.length
      }
    }
  });
});

app.use('/api/contracts', contractRoutes);
app.use('/api/payment-nodes', paymentNodeRoutes);
app.use('/api/acceptance-emails', acceptanceEmailRoutes);
app.use('/api/confirmations', confirmationRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/failed-records', failedRecordsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR',
    message: err.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`法务合同履约验收回放链路服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log('');
    console.log('预设用户:');
    console.log('  - 主管(全部权限):    x-user-id: admin');
    console.log('  - 录入员:            x-user-id: operator');
    console.log('  - 复核员:            x-user-id: reviewer');
    console.log('  - 只读用户:          x-user-id: viewer (默认)');
  });
}

module.exports = app;
