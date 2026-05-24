import { RecordSource } from '../types';
export interface ImportResult {
    batchId: string;
    batchNo: string;
    totalRecords: number;
    importedRecords: number;
    dirtyRecords: number;
    errors: string[];
}
export declare class DataImporter {
    private db;
    private validator;
    importFromCSV(filePath: string, source: RecordSource, importedBy: string): Promise<ImportResult>;
    private processRecord;
    validateBatch(batchId: string, validatedBy: string): {
        crossSourceIssues: number;
        duplicateIssues: number;
    };
}
