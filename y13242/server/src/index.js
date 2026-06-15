const express = require('express');
const cors = require('cors');
const path = require('path');

const boothsRouter = require('./routes/booths');
const stateRouter = require('./routes/state');
const { generatePageSummary } = require('./utils/validator');
const AppState = require('./models/AppState');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/booths', boothsRouter);
app.use('/api/state', stateRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '音乐节摊位清单归档服务运行正常', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    service: '音乐节摊位清单归档',
    version: '1.0.0',
    endpoints: {
      booths: '/api/booths',
      state: '/api/state',
      health: '/api/health',
    },
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 音乐节摊位清单归档服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📊 API 文档:   http://localhost:${PORT}/api\n`);

  const summary = generatePageSummary();
  AppState.setState('page_summary', summary);
  AppState.setState('last_start_time', new Date().toISOString());
  console.log('📈 页面摘要已生成并保存');
});

module.exports = app;
