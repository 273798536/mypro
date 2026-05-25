import { SourceType } from '../types';
export interface ParsedRecord {
    originalLineNumber: number;
    data: Record<string, any>;
    isValid: boolean;
    failureReason?: string;
}
export interface ParseResult {
    records: ParsedRecord[];
    totalCount: number;
    validCount: number;
    invalidCount: number;
    sourceType: SourceType;
}
declare function validateCabinetInventory(row: any, lineNumber: number): ParsedRecord;
export declare function getValidator(sourceType: SourceType): typeof validateCabinetInventory;
export declare function parseCsvFile(filePath: string, sourceType?: SourceType): Promise<ParseResult>;
export declare function parseExcelFile(filePath: string, sourceType?: SourceType): Promise<ParseResult>;
export declare function parseFile(filePath: string, sourceType?: SourceType): Promise<ParseResult>;
export declare function mapCabinetInventoryData(row: any, batchId: string): any;
export declare function mapRestockPhotoData(row: any, batchId: string): any;
export declare function mapRefundRecordData(row: any, batchId: string): any;
export declare function mapExceptionPhotoData(row: any, batchId: string): any;
export declare function mapSmsScreenshotData(row: any, batchId: string): any;
export declare function getDataMapper(sourceType: SourceType): typeof mapCabinetInventoryData;
export {};
//# sourceMappingURL=parser.d.ts.map