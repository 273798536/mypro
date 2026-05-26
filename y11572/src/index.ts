import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './config/logger';
import { testConnection, syncDatabase } from './database/connection';
import { setupAssociations } from './models';
import { getCompensationQueue } from './queues/compensationQueue';
import routes from './routes';
import errorHandler, { notFoundHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting compensation queue API server...');
    logger.info(`Database target: ${config.database.host}:${config.database.port}/${config.database.name}`);
    logger.info(`Redis target: ${config.redis.host}:${config.redis.port}`);

    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error(
        'Failed to connect to PostgreSQL. ' +
        `Please ensure PostgreSQL is running at ${config.database.host}:${config.database.port} ` +
        `and database "${config.database.name}" exists. ` +
        'Run "docker-compose up -d" or start PostgreSQL manually.'
      );
      process.exit(1);
    }

    setupAssociations();
    await syncDatabase(false);

    getCompensationQueue();

    app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API Docs: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    const { closeQueues } = await import('./queues/compensationQueue');
    await closeQueues();

    const { closeRedis } = await import('./config/redis');
    await closeRedis();

    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

export default app;
