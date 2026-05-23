import { Database } from '../types';
interface ExportOptions {
    format: 'csv' | 'json';
    includeRaw?: boolean;
    includeFailed?: boolean;
    includeFixed?: boolean;
}
export declare function exportData(db: Database, outputDir: string, options: ExportOptions, generatedBy: string): Promise<string>;
export declare function exportFailedRecords(db: Database, outputDir: string, generatedBy: string): Promise<string>;
export {};
