const express = require('express');
const logger = require('./config/logger');

const importRoutes = require('./routes/import');
const workflowRoutes = require('./routes/workflow');
const investigationRoutes = require('./routes/investigation');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/import', importRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/investigation', investigationRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  logger.error('未处理的异常', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

app.listen(PORT, () => {
  logger.info(`服务器启动在端口 ${PORT}`);
  console.log(`\n🚀 线下展会物料权限追责台账 API 已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`\n📚 主要接口:`);
  console.log(`   POST /api/import/:recordType  - 导入数据`);
  console.log(`   GET  /api/investigation/chain/:id  - 获取追责链`);
  console.log(`   GET  /api/investigation/lost-items  - 遗失物品列表`);
  console.log(`   POST /api/workflow/:type/:id/submit  - 提交审核`);
  console.log(`   POST /api/export/lost-items  - 导出报告`);
  console.log(`\n`);
});

module.exports = app;
