import express from 'express';
import fs from 'fs';
import authRoutes from './routes/auth.routes';
import reimbursementRoutes from './routes/reimbursement.routes';
import reportRoutes from './routes/report.routes';
import deadLetterRoutes from './routes/deadLetter.routes';
import logger from './utils/logger';
import { RetryQueueService } from './services/retryQueue.service';

const app = express();
const PORT = process.env.PORT || 3000;

const logsDir = './logs';
const exportsDir = './exports';
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dead-letters', deadLetterRoutes);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

let retryInterval: NodeJS.Timeout;

const startRetryProcessor = () => {
  const intervalMs = 60000;
  retryInterval = setInterval(async () => {
    try {
      await RetryQueueService.processRetryQueue();
    } catch (error) {
      logger.error('重试队列处理异常', error);
    }
  }, intervalMs);
  
  logger.info(`重试队列处理器已启动，每 ${intervalMs / 1000} 秒执行一次`);
};

const server = app.listen(PORT, () => {
  logger.info(`服务器启动成功，监听端口 ${PORT}`);
  logger.info(`健康检查: http://localhost:${PORT}/health`);
  startRetryProcessor();
});

process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  clearInterval(retryInterval);
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  clearInterval(retryInterval);
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

export default app;
