import { BaseEntity } from './BaseEntity';
export declare class FailedRecord extends BaseEntity {
    recordType: string;
    rawData: Record<string, any>;
    errorMessage: string;
    errorDetails?: Record<string, any>;
    sourceSystem?: string;
    batchId?: string;
    retryCount: number;
    lastRetryAt?: Date;
    isResolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
    metadata?: Record<string, any>;
}
