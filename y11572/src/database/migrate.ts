import sequelize, { syncDatabase, testConnection } from './connection';
import { setupAssociations } from '../models';
import logger from '../config/logger';

const migrate = async (): Promise<void> => {
  try {
    logger.info('Starting database migration...');

    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    setupAssociations();

    const force = process.argv.includes('--force');
    await syncDatabase(force);

    logger.info('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  }
};

migrate();
