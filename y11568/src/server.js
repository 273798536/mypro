const express = require('express');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const workOrderRoutes = require('./routes/workOrders');
const inspectionPhotoRoutes = require('./routes/inspectionPhotos');
const repairHotlineRoutes = require('./routes/repairHotlines');
const sparePartRoutes = require('./routes/spareParts');
const externalReceiptRoutes = require('./routes/externalReceipts');
const reconciliationRoutes = require('./routes/reconciliation');
const exportRoutes = require('./routes/export');
const replayRoutes = require('./routes/replay');
const badDataRoutes = require('./routes/badData');

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '50001');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/inspection-photos', inspectionPhotoRoutes);
app.use('/api/repair-hotlines', repairHotlineRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/external-receipts', externalReceiptRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/replay', replayRoutes);
app.use('/api/bad-data', badDataRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '城市照明抢修验收回放链路服务',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

const MAX_PORT = 65535;
const MAX_RETRIES = 50;
const HIGH_PORT_START = 49152;
let retryCount = 0;
let hasTriedHighPort = false;

const startServer = (port = PORT, host = HOST) => {
  if (retryCount >= MAX_RETRIES) {
    console.error(`\n❌ 错误: 已尝试 ${MAX_RETRIES} 个端口仍无法启动服务`);
    console.error('请手动指定可用端口启动:');
    console.error('  PORT=12345 npm start');
    process.exit(1);
  }

  if (port > MAX_PORT) {
    console.error(`\n❌ 错误: 端口 ${port} 超出有效范围 (1-65535)`);
    console.error('请手动指定可用端口启动:');
    console.error('  PORT=12345 npm start');
    process.exit(1);
  }

  retryCount++;
  const server = app.listen(port, host, () => {
    console.log(`\n========================================`);
    console.log(`城市照明抢修验收回放链路服务已启动`);
    console.log(`服务地址: http://${host}:${port}`);
    console.log(`健康检查: http://${host}:${port}/api/health`);
    console.log(`========================================\n`);
    console.log(`API 端点:`);
    console.log(`  POST /api/auth/login - 用户登录`);
    console.log(`  GET  /api/auth/me - 获取当前用户`);
    console.log(``);
    console.log(`  GET  /api/work-orders - 工单列表`);
    console.log(`  POST /api/work-orders - 创建工单`);
    console.log(`  GET  /api/work-orders/:id - 工单详情`);
    console.log(`  GET  /api/work-orders/:id/full-chain - 完整链路`);
    console.log(`  GET  /api/work-orders/:id/history - 操作历史`);
    console.log(``);
    console.log(`  POST /api/reconciliation/check/:id - 对账检查`);
    console.log(`  POST /api/reconciliation/batch-check - 批量对账`);
    console.log(``);
    console.log(`  GET  /api/replay/logs - 操作日志`);
    console.log(`  GET  /api/replay/work-order/:id/timeline - 工单时间线`);
    console.log(`  GET  /api/replay/abnormal-summary - 异常汇总`);
    console.log(``);
    console.log(`  GET  /api/export/summary - 导出汇总报告`);
    console.log(`========================================\n`);
  });

  server.on('error', (err) => {
    server.close();
    
    let nextPort;
    if (err.code === 'EADDRINUSE') {
      nextPort = port + 1;
      console.log(`端口 ${port} 已被占用，尝试 ${nextPort}... (尝试 ${retryCount}/${MAX_RETRIES})`);
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      if (hasTriedHighPort) {
        console.error(`\n❌ 错误: 高位端口 ${port} 仍存在权限问题`);
        console.error('当前环境可能限制了端口绑定，请尝试:');
        console.error('  1. 手动指定不同端口: PORT=12345 npm start');
        console.error('  2. 检查系统防火墙或安全策略');
        process.exit(1);
      }
      hasTriedHighPort = true;
      nextPort = HIGH_PORT_START;
      console.log(`权限不足，无法绑定 ${host}:${port}，尝试高位端口 ${nextPort}... (尝试 ${retryCount}/${MAX_RETRIES})`);
    } else {
      console.error('服务器启动失败:', err.message);
      process.exit(1);
    }
    
    startServer(nextPort, host);
  });

  return server;
};

startServer();

module.exports = app;
