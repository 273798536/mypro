const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const anomalyService = require('./services/anomalyService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.use('/api', routes);

if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

app.listen(PORT, () => {
  console.log(`
===============================================
 剧场返场曲异常提醒系统 - 后端服务已启动
 端口: ${PORT}
 API 前缀: http://localhost:${PORT}/api
 启动时间: ${new Date().toLocaleString()}
===============================================
  `);
  const trackCount = require('./db').prepare('SELECT COUNT(*) AS c FROM tracks').get().c;
  if (trackCount > 0) {
    const result = anomalyService.runAllChecks();
    console.log(`[启动自检] 已扫描${trackCount}条曲目，检测到异常:`, result);
  } else {
    console.log('[启动] 当前无数据，可运行 npm run seed 导入示例数据');
  }
});
