const express = require('express');
const config = require('./config/config');
const queueService = require('./services/queueService');
const compensationService = require('./services/compensationService');

const authRoutes = require('./routes/auth');
const workOrderRoutes = require('./routes/workOrders');
const queueRoutes = require('./routes/queue');
const compensationRoutes = require('./routes/compensation');
const photoRoutes = require('./routes/photos');
const auditRoutes = require('./routes/audit');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/workorders', workOrderRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/compensation', compensationRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', async (req, res) => {
  const queueStatus = await queueService.getQueueStatus();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    queueStatus
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

async function queueHandler(item) {
  console.log(`处理队列项: ${item.id}, 类型: ${item.item_type}`);
  
  compensationService.validateAndProcess(item);
  
  const records = await compensationService.createCompensationRecords(
    item.id,
    item.payload.workOrderId,
    item.payload.materials
  );
  
  console.log(`创建了 ${records.length} 条补偿记录`);
  
  return records;
}

app.listen(config.port, () => {
  console.log(`\n🚀 水务抢修材料重试补偿队列服务已启动`);
  console.log(`📡 服务地址: http://localhost:${config.port}`);
  console.log(`💾 数据库: ${config.database.path}`);
  console.log(`\n📋 默认账号:`);
  console.log(`   主管: admin / admin123`);
  console.log(`   复核: reviewer1 / review123`);
  console.log(`   录入: entry1 / entry123`);
  console.log(`   只读: viewer1 / view123`);
  console.log(`\n🔧 API 端点:`);
  console.log(`   POST /api/auth/login - 登录`);
  console.log(`   GET  /api/health - 健康检查`);
  console.log(`   GET  /api/queue/status - 队列状态`);
  console.log(`   GET  /api/queue/classification - 重试分类统计`);
  console.log(`\n`);

  queueService.startProcessingLoop(queueHandler, 3000);
});

module.exports = app;
