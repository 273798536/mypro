import { RecordStatus, ImportSource } from '../types';
export declare class SecondaryConfirmEntity {
    id: string;
    confirmNo: string;
    relatedRecordType: ImportSource;
    relatedRecordId: string;
    deviceId: string;
    deviceCode: string;
    confirmer: string;
    confirmDate: Date;
    confirmContent: string;
    status: RecordStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
