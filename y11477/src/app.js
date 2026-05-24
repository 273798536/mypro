const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const eventsRouter = require('./routes/events');
const compensationsRouter = require('./routes/compensations');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: '会议室占用重试补偿队列 API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/events', eventsRouter);
app.use('/api/compensations', compensationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`会议室占用重试补偿队列 API 服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log('');
    console.log('测试用户账号:');
    console.log('  录入员: admin_entry');
    console.log('  复核员: admin_review');
    console.log('  主管:   admin_super');
    console.log('  只读:   admin_readonly');
    console.log('');
    console.log('使用方式: 在请求 header 中添加 x-user-token: <用户名>');
    console.log('或在 URL 参数中添加 ?user=<用户名>');
  });
}

module.exports = app;
