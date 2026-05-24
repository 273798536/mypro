import { AttendanceDatabase } from './database';
import { SourceType, ImportResult } from './types';
export declare class ImportService {
    private db;
    constructor(db: AttendanceDatabase);
    importFromFile(filePath: string, sourceType: SourceType, operator: string): Promise<ImportResult>;
    private parseFile;
    private parseRawData;
    private validateParsedData;
}
