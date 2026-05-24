import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { BorrowApplication } from '../entities/BorrowApplication';
import { ExpressOrder } from '../entities/ExpressOrder';
import { CompensationRecord } from '../entities/CompensationRecord';
import { SupervisorComment } from '../entities/SupervisorComment';
import { RetryQueue } from '../entities/RetryQueue';
import { DeadLetter } from '../entities/DeadLetter';
import { OperationLog } from '../entities/OperationLog';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './library_loan_queue.db',
  synchronize: true,
  logging: false,
  entities: [
    BorrowApplication,
    ExpressOrder,
    CompensationRecord,
    SupervisorComment,
    RetryQueue,
    DeadLetter,
    OperationLog
  ],
  migrations: [],
  subscribers: []
});

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}
