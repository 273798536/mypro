import { DataSource, ImportResult, Database } from '../types';
export declare function importCsvFile(filePath: string, source: DataSource, importedBy: string, db: Database): Promise<ImportResult>;
export declare function getDataSourceName(source: DataSource): string;
