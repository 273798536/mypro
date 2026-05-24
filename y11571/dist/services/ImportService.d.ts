import { ImportRecord, ImportError, EntityType } from '../types';
interface ImportResult {
    batchId: string;
    successCount: number;
    failedCount: number;
    errors: ImportError[];
}
export declare class ImportService {
    private generateBatchId;
    private createImportError;
    private isDuplicateRecord;
    importFromJsonFile(filePath: string, recordType: EntityType, importedBy?: string, skipDuplicates?: boolean): ImportResult;
    private getExistingRecords;
    private validateRecord;
    private createEntity;
    private saveEntity;
    private saveAllRecords;
    getImportBatches(): ImportRecord[];
    getBatchErrors(batchId: string): ImportError[];
}
export declare const importService: ImportService;
export {};
