const express = require('express');
const path = require('path');
const { initDatabase } = require('./models/database');
const QueueProcessor = require('./services/QueueProcessor');
const tasksRouter = require('./routes/tasks');
const importsRouter = require('./routes/imports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/tasks', tasksRouter);
app.use('/api/imports', importsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      queueProcessor: QueueProcessor.isRunning ? 'running' : 'stopped'
    }
  });
});

app.get('/api/constants', (req, res) => {
  const { TASK_STATUS, FAILURE_TYPE, AUDIT_RESULT, MAX_RETRY_COUNT, RETRY_DELAY_MINUTES } = require('./utils/constants');
  res.json({
    success: true,
    data: {
      TASK_STATUS,
      FAILURE_TYPE,
      AUDIT_RESULT,
      MAX_RETRY_COUNT,
      RETRY_DELAY_MINUTES
    }
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化完成');

    QueueProcessor.start();

    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log('API文档:');
      console.log('  GET  /api/health              - 健康检查');
      console.log('  GET  /api/constants           - 常量定义');
      console.log('  POST /api/tasks/submit        - 提交任务');
      console.log('  GET  /api/tasks               - 任务列表');
      console.log('  GET  /api/tasks/:id           - 任务详情');
      console.log('  POST /api/tasks/:id/manual-takeover - 人工接管');
      console.log('  POST /api/tasks/:id/compensate      - 补偿入账');
      console.log('  POST /api/tasks/:id/close      - 关闭任务');
      console.log('  POST /api/tasks/:id/trigger   - 触发处理');
      console.log('  GET  /api/tasks/:id/history   - 状态历史');
      console.log('  GET  /api/tasks/statistics/summary - 统计汇总');
      console.log('  POST /api/imports/upload       - 上传文件导入');
      console.log('  GET  /api/imports/batch/:id   - 批次导入记录');
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭...');
  QueueProcessor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭...');
  QueueProcessor.stop();
  process.exit(0);
});

startServer();