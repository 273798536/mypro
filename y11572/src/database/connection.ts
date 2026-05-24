import { Sequelize } from 'sequelize';
import { config } from '../config';
import logger from '../config/logger';

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    pool: {
      max: config.database.pool.max,
      min: config.database.pool.min,
      idle: config.database.pool.idle,
    },
    logging: (msg) => logger.debug(msg),
  }
);

export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
};

export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    logger.info(`Database synced successfully (force: ${force})`);
  } catch (error) {
    logger.error('Database sync failed:', error);
    throw error;
  }
};

export default sequelize;
