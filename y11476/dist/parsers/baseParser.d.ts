import { ParseResult, ParsedRecord, SourceType } from '../models/types';
export declare abstract class BaseParser<T extends ParsedRecord> {
    protected sourceType: SourceType;
    constructor(sourceType: SourceType);
    abstract parseRow(row: Record<string, string>, lineNumber: number): ParseResult<T>;
    getFileHash(filePath: string): string;
    parseCSV(filePath: string): Promise<{
        results: ParseResult<T>[];
        fileHash: string;
    }>;
    parseExcel(filePath: string): {
        results: ParseResult<T>[];
        fileHash: string;
    };
    parseFile(filePath: string): Promise<{
        results: ParseResult<T>[];
        fileHash: string;
        fileName: string;
    }>;
}
