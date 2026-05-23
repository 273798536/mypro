const express = require('express');
const { initTables } = require('./config/database');

const queueRoutes = require('./routes/queue');
const importRoutes = require('./routes/import');
const dashboardRoutes = require('./routes/dashboard');
const RetryWorker = require('./services/retry-worker.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '口腔门诊材料重试补偿队列服务运行正常',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/queue', queueRoutes);
app.use('/api/import', importRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

let server;
let retryWorker;

async function startServer() {
  await initTables();

  server = app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  口腔门诊材料重试补偿队列服务`);
    console.log(`  服务启动成功，端口: ${PORT}`);
    console.log(`  健康检查: http://localhost:${PORT}/health`);
    console.log(`========================================\n`);
  });

  retryWorker = new RetryWorker({ interval: 30000 });
  retryWorker.start();
}

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务...');
  if (retryWorker) retryWorker.stop();
  if (server) {
    server.close(() => {
      console.log('服务已关闭');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务...');
  if (retryWorker) retryWorker.stop();
  if (server) {
    server.close(() => {
      console.log('服务已关闭');
      process.exit(0);
    });
  }
});

startServer().catch(err => {
  console.error('服务启动失败:', err);
  process.exit(1);
});

module.exports = app;
