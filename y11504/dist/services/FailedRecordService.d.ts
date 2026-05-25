import { DataSource } from 'typeorm';
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
export declare class FailedRecordService {
    private dataSource;
    private repository;
    constructor(dataSource: DataSource);
    create(dto: CreateFailedRecordDto, operator?: {
        id: string;
        name: string;
    }): Promise<FailedRecord>;
    getById(id: string): Promise<FailedRecord | null>;
    list(options?: {
        page?: number;
        pageSize?: number;
        recordType?: string;
        sourceSystem?: string;
        batchId?: string;
        isResolved?: boolean;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        records: FailedRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    markResolved(id: string, resolvedBy: {
        id: string;
        name: string;
    }, notes?: string): Promise<FailedRecord | null>;
    retry(id: string, retryHandler: (rawData: Record<string, any>) => Promise<boolean>): Promise<{
        success: boolean;
        record: FailedRecord | null;
    }>;
    getStatistics(): Promise<{
        total: number;
        unresolved: number;
        resolved: number;
        byType: Record<string, number>;
    }>;
}
