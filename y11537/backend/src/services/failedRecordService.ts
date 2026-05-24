import { FailedRecord } from '../models';
import { DataSource, RetryCategory } from '../models/types';
import { Op } from 'sequelize';

interface CreateFailedRecordParams {
  source: DataSource;
  recordType: string;
  recordId?: number;
  recordNo?: string;
  queueId?: number;
  queueNo?: string;
  retryCategory: RetryCategory;
  errorCode?: string;
  errorMessage: string;
  errorDetail?: string;
  originalData?: any;
  validationErrors?: any;
  affectedReportFields?: string[];
  createdBy?: number;
}

export async function createFailedRecord(params: CreateFailedRecordParams): Promise<FailedRecord> {
  const failureNo = `FAIL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return FailedRecord.create({
    failureNo,
    source: params.source,
    recordType: params.recordType,
    recordId: params.recordId,
    recordNo: params.recordNo,
    queueId: params.queueId,
    queueNo: params.queueNo,
    retryCategory: params.retryCategory,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    errorDetail: params.errorDetail,
    originalData: params.originalData,
    validationErrors: params.validationErrors,
    affectedReportFields: params.affectedReportFields,
    excludedFromReport: true,
    createdBy: params.createdBy
  });
}

export async function resolveFailedRecord(
  id: number,
  params: {
    resolutionMethod: string;
    resolutionRemark: string;
    resolvedBy: number;
  }
): Promise<FailedRecord | null> {
  const record = await FailedRecord.findByPk(id);
  if (!record) return null;
  
  return record.update({
    isResolved: true,
    resolvedAt: new Date(),
    resolvedBy: params.resolvedBy,
    resolutionMethod: params.resolutionMethod,
    resolutionRemark: params.resolutionRemark
  });
}

export async function getFailedRecords(filters: {
  source?: DataSource;
  retryCategory?: RetryCategory;
  isResolved?: boolean;
  excludedFromReport?: boolean;
  startTime?: Date;
  endTime?: Date;
}): Promise<FailedRecord[]> {
  const where: any = {};
  
  if (filters.source) where.source = filters.source;
  if (filters.retryCategory) where.retryCategory = filters.retryCategory;
  if (filters.isResolved !== undefined) where.isResolved = filters.isResolved;
  if (filters.excludedFromReport !== undefined) where.excludedFromReport = filters.excludedFromReport;
  if (filters.startTime && filters.endTime) {
    where.createdAt = {
      [Op.between]: [filters.startTime, filters.endTime]
    };
  }
  
  return FailedRecord.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });
}

export function classifyError(error: Error): RetryCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('timeout') || message.includes('econn')) {
    return RetryCategory.NETWORK_ERROR;
  }
  
  if (message.includes('duplicate') || message.includes('unique') || message.includes('conflict')) {
    return RetryCategory.DUPLICATE_RECORD;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return RetryCategory.VALIDATION_ERROR;
  }
  
  if (message.includes('not found') || message.includes('missing') || message.includes('null')) {
    return RetryCategory.MISSING_DATA;
  }
  
  if (message.includes('system') || message.includes('internal') || message.includes('500')) {
    return RetryCategory.SYSTEM_ERROR;
  }
  
  return RetryCategory.UNKNOWN;
}
