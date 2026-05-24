import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ExceptionRecordEntity } from './entities/ExceptionRecordEntity';
import { BatchEntity } from './entities/BatchEntity';
import { AuditLogEntity } from './entities/AuditLogEntity';
import { UserEntity } from './entities/UserEntity';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './data/training-exception.db',
  synchronize: true,
  logging: true,
  entities: [
    ExceptionRecordEntity,
    BatchEntity,
    AuditLogEntity,
    UserEntity
  ],
  migrations: [],
  subscribers: [],
});
