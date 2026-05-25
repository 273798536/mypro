import TicketDao from '../daos/TicketDao';
import BatchService from './BatchService';
export declare class ExportService {
    private dao;
    private batchService;
    private exportDir;
    constructor(dao: TicketDao, exportDir?: string, batchService?: BatchService);
    private ensureExportDir;
    exportBatchToCSV(batchId: string, requestedBy: string): Promise<{
        exportId: string;
        fileUrl: string;
        successCount: number;
        failedCount: number;
    }>;
    exportTicketDetailToCSV(ticketId: string, requestedBy: string): Promise<{
        exportId: string;
        fileUrl: string;
    }>;
    getExportStatus(exportId: string): Promise<any>;
    exportInventoryDifferencesToCSV(filters: any, requestedBy: string): Promise<{
        exportId: string;
        fileUrl: string;
        totalRecords: number;
    }>;
}
export default ExportService;
