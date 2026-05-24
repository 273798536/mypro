import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  User,
  Declaration,
  TrajectoryNode,
  TaxNotice,
  SupervisorComment,
  ReconciliationResult,
  BadDataRecord
} from '../entities';

dotenv.config();

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './data/database.sqlite',
  entities: [
    User,
    Declaration,
    TrajectoryNode,
    TaxNotice,
    SupervisorComment,
    ReconciliationResult,
    BadDataRecord
  ],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  migrations: [],
  subscribers: []
});

export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established successfully');
    }
    return AppDataSource;
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    throw error;
  }
};

export const getRepository = <T>(entity: new () => T) => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return AppDataSource.getRepository(entity);
};
