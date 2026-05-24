import { DeviceStatus } from '../types';
export declare class MedicalDeviceEntity {
    id: string;
    deviceCode: string;
    deviceName: string;
    department: string;
    status: DeviceStatus;
    createdAt: Date;
    updatedAt: Date;
}
