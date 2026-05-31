const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./models');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(process.cwd(), 'data');
const exportDir = path.join(process.cwd(), 'exports');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('未捕获的错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.path,
  });
});

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('数据库连接成功');

    await db.sequelize.sync({ alter: false });
    console.log('数据库同步完成');

    app.listen(PORT, () => {
      console.log(`
====================================================
SaaS座席超额计费服务已启动
服务地址: http://localhost:${PORT}
API前缀:  http://localhost:${PORT}/api
健康检查: http://localhost:${PORT}/api/health
====================================================

数据目录: ${dataDir}
导出目录: ${exportDir}

操作人标识: 通过请求头 x-operator 传递
      `);
    });
  } catch (err) {
    console.error('服务启动失败:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
