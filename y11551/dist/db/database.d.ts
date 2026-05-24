import * as sqlite3 from 'sqlite3';
import { SourceType, RecordStatus, OperationType, ImportBatch, CabinetInventory, RestockPhoto, RefundRecord, ExceptionPhoto, SmsScreenshot, AuditLog, FailureRecord } from '../types';
export declare function getDb(): sqlite3.Database;
export declare function initDb(): Promise<void>;
export declare function closeDb(): void;
export declare function insertAuditLog(operationType: OperationType, operator: string, options?: {
    batchId?: string;
    recordId?: string;
    recordType?: string;
    beforeChange?: object;
    afterChange?: object;
    remark?: string;
}): Promise<void>;
export declare function insertBatch(batch: Omit<ImportBatch, 'id'>): Promise<string>;
export declare function updateBatchStats(batchId: string, successCount: number, failureCount: number): Promise<void>;
export declare function insertCabinetInventory(record: Omit<CabinetInventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
export declare function insertRestockPhoto(record: Omit<RestockPhoto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
export declare function insertRefundRecord(record: Omit<RefundRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
export declare function insertExceptionPhoto(record: Omit<ExceptionPhoto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
export declare function insertSmsScreenshot(record: Omit<SmsScreenshot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
export declare function insertFailureRecord(record: Omit<FailureRecord, 'id' | 'createdAt'>): Promise<string>;
export declare function getBatchById(batchId: string): Promise<ImportBatch | null>;
export declare function getBatches(sourceType?: SourceType, limit?: number): Promise<ImportBatch[]>;
export declare function getAuditLogs(limit?: number): Promise<AuditLog[]>;
export declare function getFailureRecords(batchId?: string): Promise<FailureRecord[]>;
export declare function getCabinetInventoryByCabinet(cabinetId: string): Promise<CabinetInventory[]>;
export declare function updateRecordStatus(tableName: string, recordId: string, status: RecordStatus, failureReason?: string): Promise<void>;
export declare function getRecordById(tableName: string, recordId: string): Promise<any>;
//# sourceMappingURL=database.d.ts.map