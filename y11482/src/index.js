const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const queueRoutes = require('./routes/queue');
const batchRoutes = require('./routes/batch');
const auditRoutes = require('./routes/audit');
const importRoutes = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'central-kitchen-sample-retry-service'
  });
});

app.use('/api/queue', queueRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/import', importRoutes);

app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`中央厨房留样重试补偿队列服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`========================================\n`);
  console.log(`API 文档说明:`);
  console.log(`  - 队列管理:  POST /api/queue/submit`);
  console.log(`  - 队列列表:  GET  /api/queue`);
  console.log(`  - 统计信息:  GET  /api/queue/statistics`);
  console.log(`  - 死信队列:  GET  /api/queue/dead-letter`);
  console.log(`  - 批次查询:  GET  /api/batch/query?batchNo=xxx`);
  console.log(`  - 数据导入:  POST /api/import/direct/:sourceType`);
  console.log(`  - 追加数据:  POST /api/import/append/:sourceType`);
  console.log(`  - 文件上传:  POST /api/import/upload/:sourceType`);
  console.log(`  - 导入源:    GET  /api/import/sources`);
  console.log(`  - 审计日志:  GET  /api/audit/entity/queue/:id`);
  console.log(`\n`);
});

module.exports = app;
