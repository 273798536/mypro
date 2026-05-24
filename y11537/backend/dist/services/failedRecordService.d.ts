import { FailedRecord } from '../models';
import { DataSource, RetryCategory } from '../models/types';
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
export declare function createFailedRecord(params: CreateFailedRecordParams): Promise<FailedRecord>;
export declare function resolveFailedRecord(id: number, params: {
    resolutionMethod: string;
    resolutionRemark: string;
    resolvedBy: number;
}): Promise<FailedRecord | null>;
export declare function getFailedRecords(filters: {
    source?: DataSource;
    retryCategory?: RetryCategory;
    isResolved?: boolean;
    excludedFromReport?: boolean;
    startTime?: Date;
    endTime?: Date;
}): Promise<FailedRecord[]>;
export declare function classifyError(error: Error): RetryCategory;
export {};
