import { DatabaseService } from '../db/service';
import { DeviceStatus, RecordStatus } from '../types';
export interface DashboardStats {
    totalDevices: number;
    devicesByStatus: Record<DeviceStatus, number>;
    totalInspections: number;
    inspectionsByStatus: Record<RecordStatus, number>;
    totalCertificates: number;
    expiredCertificates: number;
    totalQuotes: number;
    quotesPendingApproval: number;
    totalConfirms: number;
    importFailures: number;
}
export interface ReconciliationResult {
    deviceCode: string;
    deviceName: string;
    hasInspection: boolean;
    hasValidCertificate: boolean;
    hasMaintenance: boolean;
    lastInspectionDate: Date | null;
    certificateExpiryDate: Date | null;
    issues: string[];
}
export declare class ReportService {
    private dbService;
    constructor(dbService: DatabaseService);
    getDashboardStats(): Promise<DashboardStats>;
    private countByStatus;
    reconcileDeviceRecords(): Promise<ReconciliationResult[]>;
    getStatusAuditTrail(entityType: string, entityId: string): Promise<any[]>;
    exportToCSV<T>(data: T[], fields: string[], filename: string): Promise<string>;
    exportDeviceStatusReport(): Promise<string>;
    exportInspectionReport(): Promise<string>;
    exportCertificateReport(): Promise<string>;
    exportReconciliationReport(): Promise<string>;
}
