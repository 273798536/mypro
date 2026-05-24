import { SourceType, AppointmentRecord, LocationRecord, ReviewRecord, PriceAdjustmentRecord } from '../types';
export interface ImportResult<T> {
    records: T[];
    rawRecords: Array<{
        row: number;
        data: Record<string, any>;
    }>;
    errors: Array<{
        row: number;
        error: string;
    }>;
    sourceFile: string;
}
export declare function detectSourceType(fileName: string): SourceType | null;
export declare function parseCsvFile<T>(filePath: string): Promise<ImportResult<T>>;
export declare function extractArchive(archivePath: string, outputDir: string): Promise<string[]>;
export declare function normalizeAppointment(data: Record<string, any>, rawRow: number, sourceFile: string): Omit<AppointmentRecord, 'id' | 'source'>;
export declare function normalizeLocation(data: Record<string, any>, rawRow: number, sourceFile: string): Omit<LocationRecord, 'id' | 'source'>;
export declare function normalizeReview(data: Record<string, any>, rawRow: number, sourceFile: string): Omit<ReviewRecord, 'id' | 'source'>;
export declare function normalizePriceAdjustment(data: Record<string, any>, rawRow: number, sourceFile: string): Omit<PriceAdjustmentRecord, 'id' | 'source'>;
export declare function createTempDir(): string;
export declare function cleanupTempDir(dir: string): void;
