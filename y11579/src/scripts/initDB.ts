import { initDB } from '../db';
import { logger } from '../utils/logger';

async function main() {
  logger.info('开始初始化数据库...');
  await initDB();
  logger.info('数据库初始化完成！');
}

main().catch(err => {
  logger.error('初始化失败:', err);
  process.exit(1);
});
