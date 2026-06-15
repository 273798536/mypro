const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

const batchesRouter = require('./routes/batches');
const reviewRouter = require('./routes/review');
const riskRouter = require('./routes/risk');
const reportRouter = require('./routes/report');

app.use('/api/batches', batchesRouter);
app.use('/api/review', reviewRouter);
app.use('/api/risk', riskRouter);
app.use('/api/report', reportRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', service: '港区危险品泊位检查系统' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    service: '港区危险品泊位检查系统API',
    endpoints: {
      batches: '/api/batches',
      review: '/api/review',
      risk: '/api/risk',
      report: '/api/report'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  港区危险品泊位检查系统`);
  console.log(`  服务已启动: http://localhost:${PORT}`);
  console.log(`  API文档: http://localhost:${PORT}/api`);
  console.log(`========================================`);
});

module.exports = app;
