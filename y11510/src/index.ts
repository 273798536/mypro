import app from './app';
import { config } from './config';
import { initDatabase } from './db';
import { autoCheckService } from './services/autoCheckService';
import logger from './utils/logger';

async function startServer() {
  try {
    await initDatabase();
    logger.info('Database initialized');

    if (config.autoCheck.enabled) {
      setInterval(async () => {
        try {
          logger.info('Running scheduled auto-check');
          await autoCheckService.runAllChecks();
        } catch (error) {
          logger.error('Scheduled auto-check failed', { error });
        }
      }, config.autoCheck.interval);
      logger.info(
        `Auto-check scheduled with interval ${config.autoCheck.interval}ms`
      );
    }

    app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

startServer();
