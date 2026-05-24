import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { config } from './config';
import { logger } from './utils/logger';
import { taskService } from './services/task.service';
import recordRoutes from './routes/record.routes';
import taskRoutes from './routes/task.routes';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/error.handler';

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    },
  });
});

app.use('/api/records', recordRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

function ensureDirectories(): void {
  const dirs = [
    config.upload.dir,
    config.export.dir,
    config.log.dir,
    path.dirname(config.database.path),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info('Created directory', { dir });
    }
  }
}

import path from 'path';

function startServer(): void {
  ensureDirectories();

  const server = app.listen(config.server.port, () => {
    logger.info('Server started', {
      port: config.server.port,
      host: config.server.host,
    });
    console.log(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
    console.log(`📊 Health check: http://${config.server.host}:${config.server.port}/health`);
  });

  taskService.startTaskProcessor();

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    taskService.stopTaskProcessor();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    taskService.stopTaskProcessor();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

if (require.main === module) {
  startServer();
}

export { app, startServer };
