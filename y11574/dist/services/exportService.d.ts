import { User } from '../types';
import { liabilityRecordModel } from '../models/liabilityRecord';
export declare const exportService: {
    exportToCSV(filters: Parameters<typeof liabilityRecordModel.list>[0], user: User, isMasked?: boolean): Promise<{
        csv: string;
        exportLogId: string;
    }>;
    getExportHistory(user: User, limit?: number): Promise<import("../types").ExportLog[]>;
    verifyExportConsistency(exportId: string): Promise<{
        consistent: boolean;
        expectedChecksum: string;
        actualChecksum?: string;
        details: {
            recordCount: number;
            totalAmount: number;
        };
    }>;
};
