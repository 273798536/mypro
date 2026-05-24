const express = require('express');
const config = require('../config');
const { initDatabase } = require('./database');
const { requestLogger, errorHandler } = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const batchesRouter = require('./routes/batches');
const reportsRouter = require('./routes/reports');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'bid-seal-exception-state-machine',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/batches', batchesRouter);
app.use('/api/reports', reportsRouter);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path
  });
});

async function startServer() {
  try {
    await initDatabase();
    
    app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running on http://${config.server.host}:${config.server.port}`);
      logger.info(`API Documentation:
- POST   /api/batches              - 创建批次
- GET    /api/batches              - 批次列表
- GET    /api/batches/:id          - 批次详情
- GET    /api/batches/:id/detail   - 完整详情（含附件、异常记录）
- GET    /api/batches/:id/history  - 历史轨迹
- GET    /api/batches/:id/failed-records - 失败记录列表
- GET    /api/batches/:id/validation   - 运行一致性校验
- POST   /api/batches/:id/attachments  - 上传附件
- POST   /api/batches/:id/actions/submit - 提交
- POST   /api/batches/:id/actions/review - 复核
- POST   /api/batches/:id/actions/freeze - 冻结
- POST   /api/batches/:id/actions/unfreeze - 解冻
- POST   /api/batches/:id/actions/settle - 结算
- POST   /api/batches/:id/actions/archive - 归档
- POST   /api/batches/:id/export   - 导出报表（含异常明细）
- GET    /api/reports              - 报表汇总
      `);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
