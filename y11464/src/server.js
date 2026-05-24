const express = require('express');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

require('./scripts/init-db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.use('/exports', express.static(path.join(__dirname, '../exports')));

app.use((err, req, res, next) => {
  console.error(err.stack);
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
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  口腔门诊材料权限追责台账 API                                 ║
║  服务已启动: http://localhost:${PORT}                           ║
║                                                              ║
║  API 文档:                                                   ║
║  GET  /api/health                 - 健康检查                 ║
║  POST /api/ledgers                 - 创建台账                 ║
║  GET  /api/ledgers                 - 台账列表                 ║
║  GET  /api/ledgers/:id             - 台账详情                 ║
║  POST /api/ledgers/:id/submit      - 提交审核                 ║
║  POST /api/ledgers/:id/reject      - 驳回申请                 ║
║  POST /api/ledgers/:id/confirm     - 审核通过                 ║
║  POST /api/ledgers/:id/readonly    - 标记只读审计             ║
║  GET  /api/summary                 - 汇总统计                 ║
║  POST /api/export                  - 导出数据                 ║
║  GET  /api/director/views/recent   - 主任视图(近期)           ║
║  GET  /api/failed-records          - 失败记录                 ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
