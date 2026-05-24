import { Repository } from 'typeorm';
import { Batch } from '../entities/batch.entity';
import { BatchStatus } from '../common/enums/batch-status.enum';
export interface ManagerViewData {
    batchId: string;
    batchNo: string;
    status: BatchStatus;
    statusBeforeFrozen?: BatchStatus;
    freezeReason?: string;
    manualReason?: string;
    totalAmount: number;
    totalRepairOrders: number;
    totalSparePartScans: number;
    totalDirtyRecords: number;
    reviewOpinion?: string;
    createdByName: string;
    createdAt: Date;
}
export declare class ExportService {
    private batchRepository;
    constructor(batchRepository: Repository<Batch>);
    getManagerView(): Promise<ManagerViewData[]>;
    exportToCSV(): Promise<string>;
    getStatistics(): Promise<{
        totalBatches: number;
        statusCounts: Record<string, number>;
        totalAmount: number;
        totalFrozen: number;
    }>;
}
