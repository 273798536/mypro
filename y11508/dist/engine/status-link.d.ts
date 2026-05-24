import { DatabaseService } from '../db/service';
import { DeviceStatus } from '../types';
export interface StatusLinkResult {
    deviceId: string;
    deviceCode: string;
    oldStatus: DeviceStatus;
    newStatus: DeviceStatus;
    reason: string;
    triggeredBy: string;
}
export declare class StatusLinkEngine {
    private dbService;
    private systemUser;
    constructor(dbService: DatabaseService);
    checkAndUpdateExpiredCertificates(): Promise<StatusLinkResult[]>;
    checkCertificateRenewal(deviceCode: string): Promise<StatusLinkResult | null>;
    deactivateDevice(deviceCode: string, operator: string, reason: string): Promise<StatusLinkResult | null>;
    activateDevice(deviceCode: string, operator: string, reason: string): Promise<StatusLinkResult | null>;
    runFullStatusCheck(): Promise<StatusLinkResult[]>;
    getDeviceStatusSummary(): Promise<{
        status: DeviceStatus;
        count: number;
    }[]>;
}
