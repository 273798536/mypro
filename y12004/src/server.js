const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const projectsRouter = require('./routes/projects');
const investorsRouter = require('./routes/investors');
const contractsRouter = require('./routes/contracts');
const revenueRouter = require('./routes/revenue');
const costsRouter = require('./routes/costs');
const sharingRouter = require('./routes/sharing');
const versionRouter = require('./routes/version');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'running',
      timestamp: new Date().toISOString(),
      service: 'Film Revenue Sharing System'
    }
  });
});

app.use('/api/projects', projectsRouter);
app.use('/api/investors', investorsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/revenue', revenueRouter);
app.use('/api/costs', costsRouter);
app.use('/api/sharing', sharingRouter);
app.use('/api/version', versionRouter);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('数据库连接成功');

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  影视投资回款分账系统已启动`);
      console.log(`  服务地址: http://localhost:${PORT}`);
      console.log(`  健康检查: http://localhost:${PORT}/api/health`);
      console.log(`========================================\n`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
