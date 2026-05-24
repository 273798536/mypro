import { RecordStatus } from '../types';
export declare class InspectionRecordEntity {
    id: string;
    recordNo: string;
    deviceId: string;
    deviceCode: string;
    inspector: string;
    inspectionDate: Date;
    inspectionItems: Record<string, any>;
    conclusion: string;
    status: RecordStatus;
    remarks: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
