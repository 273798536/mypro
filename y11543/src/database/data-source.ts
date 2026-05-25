import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Batch, Material, AuditResult, CostDaily, MaterialMapping, CustomerRemark, AuditLog, StoreHandover } from '../entities';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(dataDir, 'ad-material-audit.db'),
  synchronize: true,
  logging: false,
  entities: [
    Batch,
    Material,
    AuditResult,
    CostDaily,
    MaterialMapping,
    CustomerRemark,
    AuditLog,
    StoreHandover
  ],
  migrations: [],
  subscribers: []
});

export async function initDatabase() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ Database connected successfully');
    }
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}
