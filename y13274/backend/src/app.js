const express = require('express');
const cors = require('cors');
const path = require('path');
const bayService = require('./services/bayService');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/photos', express.static(path.join(__dirname, '../storage/photos')));

function initData() {
  const bays = bayService.listBays();
  if (bays.length === 0) {
    const mockBays = require('./data/mockBays');
    bayService.importBays(mockBays, 'system');
    console.log('已自动初始化模拟数据');
  } else {
    console.log(`数据文件已存在，共 ${bays.length} 条记录`);
  }
}
initData();

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`公交港湾公示清单服务已启动: http://localhost:${PORT}`);
  console.log(`API 基础路径: http://localhost:${PORT}/api`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`Markdown报告: http://localhost:${PORT}/api/report`);
});

module.exports = app;
