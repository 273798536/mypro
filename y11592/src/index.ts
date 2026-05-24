import app from './app';
import { config } from './config';
import { testConnection } from './database/connection';
import { initModels } from './models';
import { queueWorker } from './services';
import logger from './utils/logger';

async function bootstrap() {
  try {
    await testConnection();
    logger.info('数据库连接成功');

    await initModels();
    logger.info('模型初始化完成');

    queueWorker.start();

    app.listen(config.port, () => {
      logger.info(`服务启动成功，端口: ${config.port}`);
      logger.info(`环境: ${config.nodeEnv}`);
      logger.info(`API文档: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('服务启动失败:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭...');
  queueWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在关闭...');
  queueWorker.stop();
  process.exit(0);
});

bootstrap();
