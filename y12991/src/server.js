const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initSchema } = require('./db');

const materialsRouter = require('./routes/materials');
const migrationsRouter = require('./routes/migrations');
const reviewsRouter = require('./routes/reviews');
const reportsRouter = require('./routes/reports');
const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '多环境配置漂移审核系统运行正常',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/materials', materialsRouter);
app.use('/api/migrations', migrationsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

app.use((err, req, res, next) => {
  console.error('服务错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

async function startServer() {
  try {
    await initSchema();
    app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(`  多环境配置漂移审核系统`);
      console.log(`  服务已启动: http://localhost:${PORT}`);
      console.log(`  健康检查: http://localhost:${PORT}/api/health`);
      console.log(`========================================`);
    });
  } catch (err) {
    console.error('启动服务失败:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
