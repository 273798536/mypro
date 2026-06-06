import { ExceptionRecord, ProcessingRecord, RecordStatus, ExportData, ExportSummary } from '../types';

export interface ConsistencyIssue {
  type: 'status_mismatch' | 'history_missing' | 'duplicate_conclusion' | 'export_mismatch';
  recordId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConsistencyResult {
  valid: boolean;
  issues: ConsistencyIssue[];
}

export function validateDataConsistency(
  records: ExceptionRecord[],
  processingHistory: ProcessingRecord[]
): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  for (const record of records) {
    const recordHistory = processingHistory.filter(p => p.exceptionId === record.id);

    if (recordHistory.length > 0) {
      const lastRecord = recordHistory.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      if (lastRecord.newStatus !== record.status) {
        issues.push({
          type: 'status_mismatch',
          recordId: record.id,
          message: `记录状态(${record.status})与最后处理记录状态(${lastRecord.newStatus})不一致`,
          severity: 'error'
        });
      }
    }

    if (record.status !== RecordStatus.PENDING && record.status !== RecordStatus.NORMAL) {
      if (recordHistory.length === 0) {
        issues.push({
          type: 'history_missing',
          recordId: record.id,
          message: `记录状态为${record.status}但无处理历史记录`,
          severity: 'warning'
        });
      }
    }
  }

  const recordMap = new Map<string, ExceptionRecord>();
  for (const record of records) {
    if (record.source?.originalId) {
      const existing = recordMap.get(record.source.originalId);
      if (existing && existing.status !== record.status) {
        issues.push({
          type: 'duplicate_conclusion',
          recordId: record.id,
          message: `同源记录(${record.source.originalId})存在多份不同结论: ${existing.id}(${existing.status}) vs ${record.id}(${record.status})`,
          severity: 'error'
        });
      }
      recordMap.set(record.source.originalId, record);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function validateExportConsistency(
  exportData: ExportData,
  uiRecords: ExceptionRecord[]
): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  const exportStatusCounts = exportData.summary.statusCounts;
  const actualStatusCounts: Record<string, number> = {};

  for (const record of exportData.records) {
    actualStatusCounts[record.status] = (actualStatusCounts[record.status] || 0) + 1;
  }

  for (const status of Object.keys(exportStatusCounts)) {
    if (exportStatusCounts[status as RecordStatus] !== (actualStatusCounts[status] || 0)) {
      issues.push({
        type: 'export_mismatch',
        recordId: 'summary',
        message: `导出摘要状态统计与实际记录数不一致: ${status} 摘要=${exportStatusCounts[status as RecordStatus]} 实际=${actualStatusCounts[status] || 0}`,
        severity: 'error'
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function generateExportSummary(
  records: ExceptionRecord[],
  processingHistory: ProcessingRecord[]
): ExportSummary {
  const statusCounts: Record<RecordStatus, number> = {
    [RecordStatus.NORMAL]: 0,
    [RecordStatus.PENDING]: 0,
    [RecordStatus.ABNORMAL]: 0,
    [RecordStatus.OFFLINE_MISSING]: 0,
    [RecordStatus.PROCESSING]: 0
  };

  const typeCounts: Record<string, number> = {};
  const recordTypeCounts: Record<string, number> = {};

  for (const record of records) {
    statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
    typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
    recordTypeCounts[record.recordType] = (recordTypeCounts[record.recordType] || 0) + 1;
  }

  return {
    totalCount: records.length,
    statusCounts,
    typeCounts: typeCounts as any,
    recordTypeCounts: recordTypeCounts as any,
    generatedAt: new Date().toISOString()
  };
}
