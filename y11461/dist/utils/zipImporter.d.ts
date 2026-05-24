import { DataSource, Database, ImportResult } from '../types';
interface ZipImportResult {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    totalRecords: number;
    importedRecords: number;
    dirtyRecords: number;
    results: {
        fileName: string;
        source: DataSource;
        result: ImportResult;
    }[];
}
export declare function importZipFile(zipFilePath: string, importedBy: string, db: Database, forceSource?: DataSource): Promise<ZipImportResult>;
export declare function getDataSourceFromSourceArg(sourceArg: string): DataSource | null;
export {};
