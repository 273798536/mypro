export interface ImportRecord {
    id?: number;
    source_type: string;
    source_file: string;
    source_file_hash: string;
    original_line_number: number;
    raw_data: string;
    parsed_data: string;
    status: 'pending' | 'success' | 'failed' | 'fixed' | 'withdrawn' | 'frozen';
    check_result?: string;
    created_at: string;
    updated_at: string;
    batch_id: string;
}
export interface OverrideRecord {
    id?: number;
    import_record_id: number;
    field_name: string;
    old_value: string;
    new_value: string;
    reason: string;
    operator: string;
    created_at: string;
}
export interface CheckResult {
    id?: number;
    import_record_id: number;
    check_type: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: string;
    created_at: string;
}
export interface ExportRecord {
    id?: number;
    batch_id: string;
    export_time: string;
    export_type: string;
    file_path: string;
    record_count: number;
    created_at: string;
}
export declare class InspectionDatabase {
    private db;
    private dbPath;
    constructor(workDir?: string);
    private initTables;
    getDbPath(): string;
    getMetadata(key: string): string | null;
    setMetadata(key: string, value: string): void;
    insertImportRecord(record: Omit<ImportRecord, 'id'>): number;
    batchInsertImportRecords(records: Omit<ImportRecord, 'id'>[]): {
        inserted: number;
        skipped: number;
    };
    updateImportRecordStatus(id: number, status: ImportRecord['status'], checkResult?: string): void;
    withdrawRecord(sourceType: string, sourceFileHash: string, lineNumber: number): boolean;
    getImportRecordsByBatch(batchId: string): ImportRecord[];
    getImportRecordsBySource(sourceType: string, batchId?: string): ImportRecord[];
    getImportRecordById(id: number): ImportRecord | undefined;
    getFailedRecords(batchId?: string): ImportRecord[];
    insertOverride(record: Omit<OverrideRecord, 'id'>): number;
    getOverridesByImportId(importId: number): OverrideRecord[];
    insertCheckResult(result: Omit<CheckResult, 'id'>): number;
    getCheckResultsByImportId(importId: number): CheckResult[];
    getCheckResultsByBatch(batchId: string): CheckResult[];
    clearCheckResultsByBatch(batchId: string): void;
    insertExportRecord(record: Omit<ExportRecord, 'id'>): number;
    getExportHistory(): ExportRecord[];
    freezeBatch(batchId: string): void;
    isBatchFrozen(batchId: string): boolean;
    getBatchList(): {
        batch_id: string;
        record_count: number;
        created_at: string;
    }[];
    getStatistics(batchId?: string): {
        total: number;
        success: number;
        failed: number;
        pending: number;
        fixed: number;
        withdrawn: number;
        frozen: number;
    };
    close(): void;
}
