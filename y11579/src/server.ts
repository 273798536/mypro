import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { initDB } from './db';
import authRoutes from './routes/auth';
import ledgerRoutes from './routes/ledger';
import { registerDefaultHandlers, startTaskScheduler } from './services/asyncTaskService';
import { logger } from './utils/logger';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/ledgers', ledgerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  const logsDir = path.join(process.cwd(), 'logs');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const dataDir = path.join(process.cwd(), 'data');
  
  [logsDir, uploadsDir, dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  await initDB();
  
  registerDefaultHandlers();
  startTaskScheduler();
  
  app.listen(config.port, () => {
    logger.info(`服务器运行在 http://localhost:${config.port}`);
    logger.info('API文档:');
    logger.info('  POST /api/auth/login - 登录');
    logger.info('  POST /api/auth/register - 注册');
    logger.info('  GET  /api/ledgers - 获取台账列表');
    logger.info('  POST /api/ledgers - 创建台账');
    logger.info('  GET  /api/ledgers/:id - 获取台账详情');
    logger.info('  POST /api/ledgers/:id/submit - 提交');
    logger.info('  POST /api/ledgers/:id/reject - 驳回');
    logger.info('  POST /api/ledgers/:id/confirm - 确认');
    logger.info('  GET  /api/ledgers/:id/history - 变更历史');
    logger.info('  GET  /api/ledgers/:id/export - 导出Excel');
  });
}

startServer().catch(err => {
  logger.error('启动服务器失败:', err);
  process.exit(1);
});

export default app;
