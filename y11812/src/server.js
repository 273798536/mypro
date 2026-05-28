const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const importRoutes = require('./routes/import');
const auditRoutes = require('./routes/audit');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '门店租金抽成复核 API',
    version: '1.0.0',
    endpoints: {
      import: {
        'POST /api/import/stores': '导入门店数据',
        'POST /api/import/contracts': '导入合同数据',
        'POST /api/import/commission-rules': '导入抽成规则',
        'POST /api/import/sales': '导入销售数据',
        'POST /api/import/upload/:dataType': 'CSV文件上传导入',
        'GET /api/import/template/:dataType': '下载导入模板'
      },
      audit: {
        'POST /api/audit/batch': '创建并执行复核批次',
        'GET /api/audit/batches': '获取复核批次列表',
        'GET /api/audit/batch/:batchId/records': '获取批次下的复核记录',
        'GET /api/audit/record/:recordId': '获取单条复核记录详情',
        'POST /api/audit/record/:recordId/status': '更新复核记录状态',
        'GET /api/audit/record/:recordId/trace': '获取追溯信息'
      },
      export: {
        'GET /api/export/audit/:batchId': '导出复核结果',
        'GET /api/export/trial/:recordId': '导出试算明细',
        'GET /api/export/impact/:batchId': '导出影响分析报告',
        'GET /api/export/sales/:storeId/:period': '导出销售明细'
      }
    },
    status: {
      database: 'connected',
      server: 'running'
    }
  });
});

app.use('/api/import', importRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       门店租金抽成复核 API 服务已启动                        ║
║                                                              ║
║       服务地址: http://localhost:${PORT}                        ║
║                                                              ║
║       可用接口:                                              ║
║         - GET    /                                           ║
║         - POST   /api/import/*                              ║
║         - POST   /api/audit/batch                           ║
║         - GET    /api/audit/batches                         ║
║         - GET    /api/audit/record/:id/trace                ║
║         - GET    /api/export/*                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
