import { Response } from 'express';
import { ExportService } from './export.service';
export declare class ExportController {
    private readonly exportService;
    constructor(exportService: ExportService);
    getManagerView(): Promise<import("./export.service").ManagerViewData[]>;
    exportCSV(res: Response): Promise<void>;
    getStatistics(): Promise<{
        totalBatches: number;
        statusCounts: Record<string, number>;
        totalAmount: number;
        totalFrozen: number;
    }>;
}
