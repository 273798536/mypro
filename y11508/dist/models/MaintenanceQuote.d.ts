import { RecordStatus } from '../types';
export declare class MaintenanceQuoteEntity {
    id: string;
    quoteNo: string;
    deviceId: string;
    deviceCode: string;
    vendor: string;
    quoteDate: Date;
    estimatedCost: number;
    maintenanceItems: string[];
    status: RecordStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
