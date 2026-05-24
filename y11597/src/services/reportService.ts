import { AppDataSource } from '../config/database';
import { CompensationRecord } from '../entities/CompensationRecord';
import { FailedRecord } from '../entities/FailedRecord';
import { CompensationStatus, DataSource, RetryCategory } from '../types/enums';

export interface StatusSummary {
  status: CompensationStatus;
  count: number;
  totalAmount: number;
}

export interface DataSourceSummary {
  dataSource: DataSource;
  count: number;
  totalAmount: number;
}

export interface RetryCategorySummary {
  category: RetryCategory;
  count: number;
  resolvedCount: number;
  unresolvedCount: number;
}

export interface ReportData {
  summary: {
    totalRecords: number;
    totalAmount: number;
    pendingRecords: number;
    pendingAmount: number;
    approvedRecords: number;
    approvedAmount: number;
    rejectedRecords: number;
    rejectedAmount: number;
    deadLetterRecords: number;
    badDataRecords: number;
  };
  statusBreakdown: StatusSummary[];
  dataSourceBreakdown: DataSourceSummary[];
  retryCategoryBreakdown: RetryCategorySummary[];
}

export class ReportService {
  private recordRepository = AppDataSource.getRepository(CompensationRecord);
  private failedRecordRepository = AppDataSource.getRepository(FailedRecord);

  async generateReport(): Promise<ReportData> {
    const allRecords = await this.recordRepository.find({
      where: { isBadData: false }
    });

    const summary = await this.getSummary(allRecords);
    const statusBreakdown = await this.getStatusBreakdown();
    const dataSourceBreakdown = await this.getDataSourceBreakdown();
    const retryCategoryBreakdown = await this.getRetryCategoryBreakdown();

    return {
      summary,
      statusBreakdown,
      dataSourceBreakdown,
      retryCategoryBreakdown
    };
  }

  private async getSummary(records: CompensationRecord[]) {
    const totalRecords = records.length;
    const totalAmount = records.reduce((sum, r) => sum + Number(r.compensationAmount), 0);

    const pendingStatuses = [
      CompensationStatus.SUBMITTED,
      CompensationStatus.QUEUED,
      CompensationStatus.PROCESSING,
      CompensationStatus.RETRYING,
      CompensationStatus.MANUAL_TAKEOVER,
      CompensationStatus.COMPENSATED,
      CompensationStatus.REVIEWING
    ];

    const pendingRecords = records.filter(r => pendingStatuses.includes(r.status));
    const approvedRecords = records.filter(r => r.status === CompensationStatus.APPROVED);
    const rejectedRecords = records.filter(r => r.status === CompensationStatus.REJECTED);
    const deadLetterRecords = records.filter(r => r.status === CompensationStatus.DEAD_LETTER);
    const badDataRecords = await this.recordRepository.count({ where: { isBadData: true } });

    return {
      totalRecords,
      totalAmount,
      pendingRecords: pendingRecords.length,
      pendingAmount: pendingRecords.reduce((sum, r) => sum + Number(r.compensationAmount), 0),
      approvedRecords: approvedRecords.length,
      approvedAmount: approvedRecords.reduce((sum, r) => sum + Number(r.compensationAmount), 0),
      rejectedRecords: rejectedRecords.length,
      rejectedAmount: rejectedRecords.reduce((sum, r) => sum + Number(r.compensationAmount), 0),
      deadLetterRecords: deadLetterRecords.length,
      badDataRecords
    };
  }

  private async getStatusBreakdown(): Promise<StatusSummary[]> {
    const result: StatusSummary[] = [];
    const statuses = Object.values(CompensationStatus);

    for (const status of statuses) {
      const records = await this.recordRepository.find({
        where: { status, isBadData: false }
      });
      
      if (records.length > 0) {
        result.push({
          status,
          count: records.length,
          totalAmount: records.reduce((sum, r) => sum + Number(r.compensationAmount), 0)
        });
      }
    }

    return result;
  }

  private async getDataSourceBreakdown(): Promise<DataSourceSummary[]> {
    const result: DataSourceSummary[] = [];
    const dataSources = Object.values(DataSource);

    for (const dataSource of dataSources) {
      const records = await this.recordRepository.find({
        where: { dataSource, isBadData: false }
      });
      
      if (records.length > 0) {
        result.push({
          dataSource,
          count: records.length,
          totalAmount: records.reduce((sum, r) => sum + Number(r.compensationAmount), 0)
        });
      }
    }

    return result;
  }

  private async getRetryCategoryBreakdown(): Promise<RetryCategorySummary[]> {
    const result: RetryCategorySummary[] = [];
    const categories = Object.values(RetryCategory);

    for (const category of categories) {
      const failedRecords = await this.failedRecordRepository.find({
        where: { retryCategory: category }
      });

      if (failedRecords.length > 0) {
        result.push({
          category,
          count: failedRecords.length,
          resolvedCount: failedRecords.filter(r => r.isResolved).length,
          unresolvedCount: failedRecords.filter(r => !r.isResolved).length
        });
      }
    }

    return result;
  }

  async getRecordsByStatus(status: CompensationStatus, page: number = 1, pageSize: number = 20) {
    const [records, total] = await this.recordRepository.findAndCount({
      where: { status, isBadData: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { records, total };
  }

  async getTraceableRecord(recordId: string) {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
      relations: ['statusHistories']
    });

    if (!record) {
      throw new Error('记录不存在');
    }

    const failedRecords = await this.failedRecordRepository.find({
      where: { recordId },
      order: { failedAt: 'DESC' }
    });

    return {
      record,
      statusHistories: record.statusHistories,
      failedRecords
    };
  }
}
