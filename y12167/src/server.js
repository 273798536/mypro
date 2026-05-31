const express = require('express');
const bodyParser = require('body-parser');
const batchesRouter = require('./routes/batches');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'microwave-uniformity-test',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/batches', batchesRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
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
║          微波炉加热均匀性测试系统                             ║
╠══════════════════════════════════════════════════════════════╣
║  服务已启动: http://localhost:${PORT}                        ║
║  健康检查:   http://localhost:${PORT}/health                 ║
║  API文档:                                                      ║
║    POST   /api/batches          - 创建新批次                 ║
║    GET    /api/batches          - 列出所有批次               ║
║    GET    /api/batches/:id      - 获取批次详情               ║
║    PATCH  /api/batches/:id/food-dimensions - 补充食物尺寸    ║
║    POST   /api/batches/:id/review     - 复核批次             ║
║    GET    /api/batches/:id/export     - 导出报告             ║
║    GET    /api/batches/:id/versions   - 查看版本历史         ║
║    GET    /api/batches/:id/compare/v1/v2 - 版本对比          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
