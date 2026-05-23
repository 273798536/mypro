import { Database, RecordStatus, DataSource, DirtyType, MaterialRecord } from '../types';
import { getDirtyRecordsByRecordId } from '../utils/database';
import { getDirtyTypeName } from '../utils/detector';
import { getDataSourceName } from '../utils/importer';

interface ReportSummary {
  totalRecords: number;
  byStatus: Record<RecordStatus, number>;
  bySource: Record<DataSource, number>;
  dirtyByType: Record<DirtyType, number>;
  pendingReview: number;
}

interface FailedRecordItem {
  recordId: string;
  sourceLine: number;
  sourceFile: string;
  source: string;
  batchNumber: string;
  materialName: string;
  issues: string[];
}

export interface Report {
  summary: ReportSummary;
  failedRecords: FailedRecordItem[];
  fixedRecords: MaterialRecord[];
  rawRecords: MaterialRecord[];
  generatedAt: string;
  generatedBy: string;
}

export function generateReport(db: Database, generatedBy: string): Report {
  const summary: ReportSummary = {
    totalRecords: db.records.length,
    byStatus: {} as Record<RecordStatus, number>,
    bySource: {} as Record<DataSource, number>,
    dirtyByType: {} as Record<DirtyType, number>,
    pendingReview: 0
  };

  for (const status of Object.values(RecordStatus)) {
    summary.byStatus[status as RecordStatus] = 0;
  }
  for (const source of Object.values(DataSource)) {
    summary.bySource[source as DataSource] = 0;
  }
  for (const type of Object.values(DirtyType)) {
    summary.dirtyByType[type as DirtyType] = 0;
  }

  const failedRecords: FailedRecordItem[] = [];
  const fixedRecords: MaterialRecord[] = [];

  for (const record of db.records) {
    summary.byStatus[record.status]++;
    summary.bySource[record.source]++;

    if (record.status === RecordStatus.DIRTY || record.status === RecordStatus.REJECTED) {
      summary.pendingReview++;
      
      const dirtyRecords = getDirtyRecordsByRecordId(db, record.id);
      const issues = dirtyRecords
        .filter(d => !d.resolved)
        .map(d => `${getDirtyTypeName(d.dirtyType)}: ${d.description}`);
      
      if (issues.length > 0) {
        failedRecords.push({
          recordId: record.id,
          sourceLine: record.sourceLine,
          sourceFile: record.sourceFile,
          source: getDataSourceName(record.source),
          batchNumber: record.batchNumber,
          materialName: record.materialName,
          issues
        });
      }
    }

    if (record.status === RecordStatus.FIXED) {
      fixedRecords.push(record);
    }
  }

  for (const dirty of db.dirtyRecords.filter(d => !d.resolved)) {
    summary.dirtyByType[dirty.dirtyType]++;
  }

  return {
    summary,
    failedRecords,
    fixedRecords,
    rawRecords: db.records,
    generatedAt: new Date().toISOString(),
    generatedBy
  };
}

export function getStatusName(status: RecordStatus): string {
  const names: Record<RecordStatus, string> = {
    [RecordStatus.PENDING]: '待处理',
    [RecordStatus.IMPORTED]: '已导入',
    [RecordStatus.DIRTY]: '有问题',
    [RecordStatus.REVIEWED]: '已复核',
    [RecordStatus.FIXED]: '已修正',
    [RecordStatus.REJECTED]: '已驳回',
    [RecordStatus.APPROVED]: '已通过'
  };
  return names[status] ?? status;
}
