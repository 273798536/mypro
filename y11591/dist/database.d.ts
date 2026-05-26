import { SourceType, RecordStatus, FixType, FactRecord, ValidationError, FixRecord, ImportBatch } from './types';
export declare class DatabaseManager {
    private db;
    private dbPath;
    constructor(workspacePath: string);
    init(): Promise<void>;
    private ensureDirectoryExists;
    private initTables;
    generateFactKey(sourceType: SourceType, waveNo: string, orderNo: string, skuCode: string): string;
    upsertFactRecord(sourceType: SourceType, waveNo: string, orderNo: string, skuCode: string, data: Record<string, any>, originalRowNumber: number, sourceFile: string, importBatchId: string): Promise<{
        isNew: boolean;
        record: FactRecord;
    }>;
    getFactRecord(factKey: string): Promise<FactRecord | null>;
    getFactRecordsByWave(waveNo: string): Promise<FactRecord[]>;
    getFactRecordsBySource(sourceType: SourceType): Promise<FactRecord[]>;
    getAllFactRecords(status?: RecordStatus): Promise<FactRecord[]>;
    updateFactStatus(factId: string, status: RecordStatus): Promise<void>;
    updateFactData(factId: string, data: Record<string, any>): Promise<void>;
    addValidationError(error: Omit<ValidationError, 'id' | 'createdAt'>): Promise<void>;
    clearValidationErrors(factId: string): Promise<void>;
    getValidationErrors(factId?: string): Promise<ValidationError[]>;
    addFixRecord(factId: string, factKey: string, fixType: FixType, oldData: Record<string, any>, newData: Record<string, any>, operator: string, reason: string): Promise<FixRecord>;
    getFixRecords(factId?: string): Promise<FixRecord[]>;
    createImportBatch(sourceType: SourceType, fileName: string, totalRecords: number, successCount: number, updateCount: number, failCount: number, operator?: string): Promise<ImportBatch>;
    getImportBatches(limit?: number): Promise<ImportBatch[]>;
    getDistinctWaveNos(): Promise<string[]>;
    close(): Promise<void>;
    private hydrateFactRecord;
}
