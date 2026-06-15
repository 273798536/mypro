const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { router: locationsRouter } = require('./routes/locations');
const complaintsRouter = require('./routes/complaints');
const photosRouter = require('./routes/photos');
const exportRouter = require('./routes/export');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 18888;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#f0f4f8"/>
      <rect x="100" y="150" width="200" height="150" fill="#4a90d9" rx="5"/>
      <rect x="120" y="170" width="60" height="50" fill="#fff" rx="2"/>
      <rect x="200" y="170" width="60" height="50" fill="#fff" rx="2"/>
      <rect x="160" y="240" width="80" height="60" fill="#2c5aa0" rx="2"/>
      <text x="200" y="140" text-anchor="middle" fill="#333" font-size="16" font-family="Arial">第一实验小学</text>
      <rect x="350" y="200" width="40" height="70" fill="#e74c3c" rx="2"/>
      <rect x="420" y="210" width="45" height="60" fill="#3498db" rx="2"/>
      <rect x="500" y="205" width="42" height="65" fill="#f39c12" rx="2"/>
      <rect x="580" y="200" width="38" height="70" fill="#2ecc71" rx="2"/>
      <rect x="0" y="320" width="800" height="30" fill="#95a5a6"/>
      <line x1="0" y1="335" x2="800" y2="335" stroke="#fff" stroke-width="2" stroke-dasharray="20,10"/>
      <rect x="100" y="350" width="600" height="200" fill="#d5e8d4" rx="5"/>
      <text x="400" y="450" text-anchor="middle" fill="#82b366" font-size="20" font-family="Arial" font-weight="bold">临时接送区</text>
      <circle cx="700" cy="150" r="30" fill="#ff6b6b"/>
      <text x="700" y="155" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">!</text>
      <text x="700" y="200" text-anchor="middle" fill="#e74c3c" font-size="12">违停</text>
      <text x="400" y="40" text-anchor="middle" fill="#333" font-size="20" font-weight="bold">巡检照片 - 实验一小门口</text>
      <text x="400" y="65" text-anchor="middle" fill="#666" font-size="14">2026-06-13 07:30</text>
    </svg>
  `;
  
  const images = [
    'inspection-1.jpg', 'inspection-1-v2.jpg', 'supplement-1.jpg',
    'inspection-2.jpg', 'inspection-2-older.jpg', 'inspection-4.jpg'
  ];
  
  images.forEach(img => {
    fs.writeFileSync(path.join(publicDir, img), svgContent);
  });
  
  console.log('已生成示例图片文件');
}

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/locations', locationsRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/export', exportRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/guide', (req, res) => {
  res.json({
    title: '学校接送投诉回放操作指引',
    sections: [
      {
        key: 'examples',
        title: '放样例',
        content: '点击"查看样例"按钮，可查看同类型投诉的历史处理案例，包括原始照片、备注、复核结果等完整材料。样例按相似度排序，帮助快速判断本次投诉的处理标准。'
      },
      {
        key: 'rerun',
        title: '重跑',
        content: '点击"重跑计算口径"按钮，系统会使用当前最新的判定规则（v2.1版）重新计算本次投诉的严重程度。计算依据包括：时段匹配、影响因素、历史同类投诉对比等。重跑结果会记录在版本历史中。'
      },
      {
        key: 'api',
        title: '查看接口返回',
        content: '点击"查看接口返回"按钮，可展开查看本次复核涉及的所有API调用详情，包括请求参数、返回数据、计算口径快照等。便于追溯问题、核对数据一致性，以及为后续优化规则提供依据。'
      }
    ],
    quickLinks: [
      { label: '材料上传位置', path: '/complaints/:id/photos', description: '在投诉详情页的"巡检材料"区' },
      { label: '异常查看位置', path: '/complaints?status=pending', description: '在投诉列表筛选"待复核"状态' },
      { label: '导出位置', path: '/export', description: '在顶部导航"导出"菜单' }
    ]
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

app.listen(PORT, () => {
  console.log(`
  🚀 学校接送投诉回放系统 - 后端服务已启动
  📍 服务地址: http://localhost:${PORT}
  📊 健康检查: http://localhost:${PORT}/api/health
  📚 API 文档:
     - GET  /api/complaints           - 投诉列表
     - GET  /api/complaints/:id       - 投诉详情
     - POST /api/complaints/:id/review - 提交复核
     - POST /api/complaints/:id/rerun - 重跑计算口径
     - GET  /api/locations/normalize  - 地点归一化
     - GET  /api/export/complaints    - 导出投诉数据
     - GET  /api/guide                - 操作指引
  👤 默认用户: 老何 (交通工程师)
  
  💡 首次运行请执行: npm run seed --workspace=backend
  `);
});
