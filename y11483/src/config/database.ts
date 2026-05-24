import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(process.cwd(), 'data', 'kitchen_trace.db'),
  synchronize: true,
  logging: false,
  entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
  subscribers: [path.join(__dirname, '..', 'subscribers', '*.{ts,js}')],
});

export async function initDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ Database connected successfully');
    }
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✓ Database connection closed');
  }
}