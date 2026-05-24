import { ConsistencyCheckResult } from '../types';
export interface ExportOptions {
    includeHistory?: boolean;
    includeErrors?: boolean;
    format?: 'json' | 'csv';
}
export declare class ExportService {
    exportAllData(options?: ExportOptions): string;
    exportTickets(): string;
    exportFailedRecords(batchId?: string): string;
    exportTicketDetail(ticketId: string): string | null;
    generateFailedRecordsTemplate(batchId?: string): string;
    checkExportConsistency(exportFilePath: string): ConsistencyCheckResult;
}
export declare const exportService: ExportService;
