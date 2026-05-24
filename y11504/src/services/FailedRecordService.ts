import { Repository, DataSource } from 'typeorm';
import { FailedRecord } from '../entities/FailedRecord';

export interface CreateFailedRecordDto {
  recordType: string;
  rawData: Record<string, any>;
  errorMessage: string;
  errorDetails?: Record<string, any>;
  sourceSystem?: string;
  batchId?: string;
  metadata?: Record<string, any>;
}

export class FailedRecordService {
  private repository: Repository<FailedRecord>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(FailedRecord);
  }

  async create(
    dto: CreateFailedRecordDto,
    operator?: { id: string; name: string }
  ): Promise<FailedRecord> {
    const record = this.repository.create({
      ...dto,
      createdBy: operator?.id,
      updatedBy: operator?.id,
    });

    return this.repository.save(record);
  }

  async getById(id: string): Promise<FailedRecord | null> {
    return this.repository.findOne({ where: { id, isDeleted: false } });
  }

  async list(
    options: {
      page?: number;
      pageSize?: number;
      recordType?: string;
      sourceSystem?: string;
      batchId?: string;
      isResolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    records: FailedRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { isDeleted: false };
    if (options.recordType !== undefined) where.recordType = options.recordType;
    if (options.sourceSystem !== undefined) where.sourceSystem = options.sourceSystem;
    if (options.batchId !== undefined) where.batchId = options.batchId;
    if (options.isResolved !== undefined) where.isResolved = options.isResolved;

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.$gte = options.startDate;
      if (options.endDate) where.createdAt.$lte = options.endDate;
    }

    const [records, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      records,
      total,
      page,
      pageSize,
    };
  }

  async markResolved(
    id: string,
    resolvedBy: { id: string; name: string },
    notes?: string
  ): Promise<FailedRecord | null> {
    const record = await this.repository.findOne({ where: { id, isDeleted: false } });
    if (!record) return null;

    record.isResolved = true;
    record.resolvedAt = new Date();
    record.resolvedBy = resolvedBy.id;
    record.updatedBy = resolvedBy.id;
    if (notes) {
      record.metadata = { ...record.metadata, resolutionNotes: notes };
    }

    return this.repository.save(record);
  }

  async retry(
    id: string,
    retryHandler: (rawData: Record<string, any>) => Promise<boolean>
  ): Promise<{ success: boolean; record: FailedRecord | null }> {
    const record = await this.repository.findOne({ where: { id, isDeleted: false } });
    if (!record) return { success: false, record: null };

    record.retryCount += 1;
    record.lastRetryAt = new Date();
    record.updatedBy = 'system';

    try {
      const success = await retryHandler(record.rawData);
      if (success) {
        record.isResolved = true;
        record.resolvedAt = new Date();
        record.resolvedBy = 'system';
        await this.repository.save(record);
        return { success: true, record };
      }
    } catch (error) {
      record.metadata = {
        ...record.metadata,
        lastRetryError: error instanceof Error ? error.message : String(error),
      };
    }

    await this.repository.save(record);
    return { success: false, record };
  }

  async getStatistics(): Promise<{
    total: number;
    unresolved: number;
    resolved: number;
    byType: Record<string, number>;
  }> {
    const total = await this.repository.count({ where: { isDeleted: false } });
    const unresolved = await this.repository.count({
      where: { isDeleted: false, isResolved: false },
    });
    const resolved = await this.repository.count({
      where: { isDeleted: false, isResolved: true },
    });

    const byType: Record<string, number> = {};
    const typeResults = await this.repository
      .createQueryBuilder('record')
      .select('record.recordType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('record.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('record.recordType')
      .getRawMany();

    for (const result of typeResults) {
      byType[result.type] = parseInt(result.count, 10);
    }

    return {
      total,
      unresolved,
      resolved,
      byType,
    };
  }
}
