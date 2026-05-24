import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as entities from '../entities';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(dataDir, 'cabinet_receipt.db'),
  entities: Object.values(entities),
  synchronize: true,
  logging: process.env.NODE_ENV === 'development'
});

export const initializeDatabase = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
  }
  return AppDataSource;
};
