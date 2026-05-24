const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-User-Role');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use('/api', routes);

app.use('/api', (req, res) => {
  console.log('[404]', req.method, req.url);
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

app.listen(PORT, () => {
  console.log(`仓库退供复核异常回执状态机服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('API 接口说明:');
  console.log('  退供申请管理: POST /api/applications, GET /api/applications');
  console.log('  批次管理: POST /api/batches, GET /api/batches, GET /api/batches/:id');
  console.log('  状态流转: quality-inspection, review, freeze, unfreeze, settle, archive');
  console.log('  附件上传: POST /api/attachments');
  console.log('  异常保留: POST /api/member-cancel, GET /api/exceptions');
  console.log('  数据导出: GET /api/export/batches, GET /api/export/internal');
  console.log('  失败记录: GET /api/failed-records');
  console.log('');
  console.log('请求头要求:');
  console.log('  X-User-Id: 用户ID');
  console.log('  X-User-Role: 用户角色 (ADMIN, PURCHASE_STAFF, WAREHOUSE_STAFF, QUALITY_STAFF, FINANCE_STAFF)');
});

module.exports = app;
