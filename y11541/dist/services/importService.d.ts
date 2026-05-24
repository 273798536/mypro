import { ImportSource, ImportResult } from '../types';
import { RawRecordData } from './recordService';
export declare function importFromCSV(filePath: string, source: ImportSource, requestId?: string): Promise<ImportResult>;
export declare function importFromZip(zipPath: string, source: ImportSource, requestId?: string): Promise<ImportResult>;
interface ProcessResult {
    recordId: string;
    isDuplicate: boolean;
    isDirty: boolean;
}
export declare function importSupplement(data: RawRecordData, requestId?: string): Promise<ProcessResult>;
export {};
