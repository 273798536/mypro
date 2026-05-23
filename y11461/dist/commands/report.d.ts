import { Database, RecordStatus, DataSource, DirtyType, MaterialRecord } from '../types';
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
export declare function generateReport(db: Database, generatedBy: string): Report;
export declare function getStatusName(status: RecordStatus): string;
export {};
