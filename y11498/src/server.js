const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   财务报销稽核验收回放链路服务已启动                         ║
║                                                              ║
║   服务地址: http://localhost:${PORT}                           ║
║   API前缀:  /api/v1                                          ║
║   健康检查:  GET /api/v1/health                              ║
║                                                              ║
║   核心功能:                                                  ║
║   ✅ 数据接入 (发票/差旅申请/付款/退款/盘点差异)             ║
║   ✅ 重复报销检测 (多人共用行程)                             ║
║   ✅ 脏记录分类 (缺字段/跨日/改名/金额冲突)                  ║
║   ✅ 审计轨迹 (所有操作留痕)                                 ║
║   ✅ 对账服务 (发票-付款对账)                                ║
║   ✅ 回放异常 (回放会话管理)                                 ║
║   ✅ 数据导出 (CSV格式)                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
