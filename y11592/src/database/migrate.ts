import { testConnection } from './connection';
import { initModels } from '../models';
import logger from '../utils/logger';

async function migrate() {
  try {
    logger.info('开始数据库迁移...');

    await testConnection();
    logger.info('数据库连接成功');

    await initModels();
    logger.info('数据库表结构同步完成');

    logger.info('数据库迁移完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

migrate();
