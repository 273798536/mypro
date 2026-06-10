import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Sample } from './entities/Sample';
import { ProcessingRecord } from './entities/ProcessingRecord';
import { AuditLog } from './entities/AuditLog';
import { SystemConfig } from './entities/SystemConfig';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: path.join(__dirname, '../data/bacteria_resistance.db'),
  entities: [Sample, ProcessingRecord, AuditLog, SystemConfig],
  synchronize: true,
  logging: false,
});

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}
