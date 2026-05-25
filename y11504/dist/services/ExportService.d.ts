import { DataSource } from 'typeorm';
import { SensitiveFieldLevel, UserRole, LedgerStatus, DataQuality } from '../types/enums';
export interface ExportOptions {
    format: 'json' | 'csv' | 'xlsx';
    includeSensitive?: boolean;
    sensitiveLevel?: SensitiveFieldLevel;
    filters?: {
        status?: LedgerStatus;
        engineerId?: string;
        dataQuality?: DataQuality;
        startDate?: Date;
        endDate?: Date;
    };
    includeHistory?: boolean;
    includePartScans?: boolean;
    includePhotos?: boolean;
    includeExternalReceipts?: boolean;
}
export declare class ExportService {
    private dataSource;
    constructor(dataSource: DataSource);
    exportLedgers(options: ExportOptions, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<{
        data: Buffer | string;
        filename: string;
        contentType: string;
    }>;
    private fetchLedgersForExport;
    private transformLedgerForExport;
    private exportToCSV;
    private exportToXLSX;
    exportSingleLedger(ledgerId: string, options: Omit<ExportOptions, 'filters'>, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<{
        data: Buffer | string;
        filename: string;
        contentType: string;
    }>;
}
