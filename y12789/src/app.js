const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/database');

const samplesRouter = require('./routes/samples');
const reagentsRouter = require('./routes/reagents');
const conversionsRouter = require('./routes/conversions');
const reviewsRouter = require('./routes/reviews');
const reportsRouter = require('./routes/reports');
const logsRouter = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '海水盐度化学换算系统',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      samples: '/api/samples',
      reagents: '/api/reagents',
      conversions: '/api/conversions',
      reviews: '/api/reviews',
      reports: '/api/reports',
      logs: '/api/logs'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/samples', samplesRouter);
app.use('/api/reagents', reagentsRouter);
app.use('/api/conversions', conversionsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/logs', logsRouter);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ code: 1, message: '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ code: 1, message: '接口不存在' });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化完成');

    app.listen(PORT, () => {
      console.log(`海水盐度化学换算系统已启动`);
      console.log(`服务地址: http://localhost:${PORT}`);
      console.log(`数据库文件: data/seawater.db`);
    });
  } catch (e) {
    console.error('启动失败:', e);
    process.exit(1);
  }
}

startServer();

module.exports = app;
