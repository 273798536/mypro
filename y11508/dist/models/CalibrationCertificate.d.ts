import { RecordStatus } from '../types';
export declare class CalibrationCertificateEntity {
    id: string;
    certificateNo: string;
    deviceId: string;
    deviceCode: string;
    calibrationAgency: string;
    calibrationDate: Date;
    expiryDate: Date;
    calibrationItems: string[];
    conclusion: 'pass' | 'fail' | 'conditional';
    status: RecordStatus;
    fileUrl: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
