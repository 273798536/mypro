import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Batch, Material, AuditResult, CostDaily, MaterialMapping, CustomerRemark, AuditLog, StoreHandover } from '../entities';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './data/ad-material-audit.db',
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
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connected successfully');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}
