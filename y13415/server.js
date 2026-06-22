const express = require('express');
const apiRouter = require('./src/api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.json({
    service: '图论割点课堂验算复核系统',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      submit: 'POST /api/records',
      list: 'GET /api/records',
      detail: 'GET /api/records/:id',
      review: 'POST /api/records/:id/review',
      withdraw: 'POST /api/records/:id/withdraw',
      judge_withdraw: 'POST /api/records/:id/withdraw/judge',
      update_param: 'POST /api/records/:id/parameter',
      exceptions_summary: 'GET /api/exceptions/summary',
      record_exceptions: 'GET /api/records/:id/exceptions',
      history: 'GET /api/records/:id/history',
      parameters: 'GET /api/records/:id/parameters',
      review_actions: 'GET /api/records/:id/review-actions'
    },
    data_persistence: 'SQLite 本地文件存储，服务重启数据不丢失',
    db_path: path.join(__dirname, 'data/cut_vertex.db')
  });
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  图论割点课堂验算复核系统');
  console.log('========================================');
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  数据库: ${path.join(__dirname, 'data/cut_vertex.db')}`);
  console.log('  数据持久化: 已启用 (SQLite WAL 模式)');
  console.log('  服务重启后状态和历史继续保留');
  console.log('========================================');
  console.log('  复核脚本: ./scripts/review.sh');
  console.log('  示例数据: ./scripts/sample_data.sh');
  console.log('========================================');
});
