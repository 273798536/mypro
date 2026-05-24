const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/database');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    name: '服装打版样衣重试补偿队列服务',
    version: '1.0.0',
    endpoints: {
      'POST /api/receipt': '提交回执',
      'GET /api/queue': '获取队列列表',
      'GET /api/queue/:id': '获取队列详情',
      'GET /api/queue/:id/unified': '获取统一事实数据',
      'GET /api/queue/:id/export': '导出数据',
      'GET /api/queue/:id/history': '获取历史记录',
      'POST /api/queue/:id/manual': '人工接管',
      'POST /api/queue/:id/close': '关闭队列',
      'POST /api/process': '处理队列',
      'GET /api/dirty': '获取脏记录',
      'POST /api/dirty/:id/correct': '修正脏记录',
      'POST /api/dirty/:queueId/auto-correct': '自动修正',
      'GET /api/dead-letter': '获取死信',
      'GET /api/stats': '获取统计',
      'GET /api/health': '健康检查'
    }
  });
});

async function startServer() {
  try {
    await db.init();
    await db.createTables();
    console.log('数据库初始化完成');
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();
