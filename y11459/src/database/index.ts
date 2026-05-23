import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './data/aftersale_trace.db',
  entities: [path.join(__dirname, '../entities/*.ts')],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
});

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}
