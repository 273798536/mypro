import 'reflect-metadata';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { initDatabase } from '../config/database';
import { requestLogger, errorHandler } from '../middleware/requestLogger';
import traceRouter from './routes/trace';

const PORT = process.env.PORT || 3000;

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function startServer() {
  await initDatabase();

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestLogger);

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'central-kitchen-sample-trace',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/trace', traceRouter);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   中央厨房留样验收回放链路 API 服务                           ║
║                                                              ║
║   服务地址: http://localhost:${PORT}                           ║
║   健康检查: http://localhost:${PORT}/health                    ║
║   API 文档: 见 README.md                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});