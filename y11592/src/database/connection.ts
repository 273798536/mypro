import { Sequelize } from 'sequelize';
import { config } from '../config';
import logger from '../utils/logger';

const isTestEnv = config.nodeEnv === 'test';

const sequelize = isTestEnv
  ? new Sequelize('sqlite::memory:', { logging: false })
  : new Sequelize(
      config.database.name,
      config.database.username,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg),
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }
    );

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
};

export default sequelize;
