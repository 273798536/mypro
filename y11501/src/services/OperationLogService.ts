import { Repository } from 'typeorm';
import { OperationLog, OperationType } from '../entities/OperationLog';
import { AppDataSource } from '../config/database';

export class OperationLogService {
  private logRepository: Repository<OperationLog>;

  constructor() {
    this.logRepository = AppDataSource.getRepository(OperationLog);
  }

  async log(
    operationType: OperationType,
    operator: string,
    description: string,
    options: {
      details?: Record<string, any>;
      batchId?: string;
      recordId?: string;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<OperationLog> {
    const log = this.logRepository.create({
      operationType,
      operator,
      description,
      details: options.details ? JSON.stringify(options.details) : undefined,
      batchId: options.batchId,
      recordId: options.recordId,
      success: options.success ?? true,
      errorMessage: options.errorMessage
    });

    return await this.logRepository.save(log);
  }

  async getHistory(
    options: {
      operationType?: OperationType;
      operator?: string;
      batchId?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ logs: OperationLog[]; total: number }> {
    const queryBuilder = this.logRepository.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (options.operationType) {
      queryBuilder.andWhere('log.operationType = :operationType', { operationType: options.operationType });
    }

    if (options.operator) {
      queryBuilder.andWhere('log.operator LIKE :operator', { operator: `%${options.operator}%` });
    }

    if (options.batchId) {
      queryBuilder.andWhere('log.batchId = :batchId', { batchId: options.batchId });
    }

    if (options.startTime) {
      queryBuilder.andWhere('log.createdAt >= :startTime', { startTime: options.startTime });
    }

    if (options.endTime) {
      queryBuilder.andWhere('log.createdAt <= :endTime', { endTime: options.endTime });
    }

    const total = await queryBuilder.getCount();

    if (options.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options.offset) {
      queryBuilder.offset(options.offset);
    }

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  async getOperationStats(startTime: Date, endTime: Date): Promise<Record<string, number>> {
    const logs = await this.logRepository
      .createQueryBuilder('log')
      .where('log.createdAt BETWEEN :startTime AND :endTime', { startTime, endTime })
      .andWhere('log.success = :success', { success: true })
      .select('log.operationType, COUNT(*) as count')
      .groupBy('log.operationType')
      .getRawMany();

    const stats: Record<string, number> = {};
    for (const log of logs) {
      stats[log.log_operationType] = Number(log.count);
    }

    return stats;
  }
}
