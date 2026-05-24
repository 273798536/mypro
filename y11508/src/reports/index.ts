import { Parser } from 'json2csv';
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

export class ReportService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const devices = await this.dbService.getDevices();
    const inspections = await this.dbService.getInspectionRecords();
    const certificates = await this.dbService.getCalibrationCertificates();
    const quotes = await this.dbService.getMaintenanceQuotes();
    const confirms = await this.dbService.getSecondaryConfirms();
    const failures = await this.dbService.getImportFailures();

    const now = new Date();
    const expiredCertificates = certificates.filter(
      c => c.expiryDate < now && c.status !== RecordStatus.REJECTED
    ).length;

    return {
      totalDevices: devices.length,
      devicesByStatus: this.countByStatus(devices, 'status'),
      totalInspections: inspections.length,
      inspectionsByStatus: this.countByStatus(inspections, 'status'),
      totalCertificates: certificates.length,
      expiredCertificates,
      totalQuotes: quotes.length,
      quotesPendingApproval: quotes.filter(q => q.approvalStatus === 'pending').length,
      totalConfirms: confirms.length,
      importFailures: failures.length
    };
  }

  private countByStatus<T extends { status: string }>(
    items: T[],
    _statusKey: keyof T
  ): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  async reconcileDeviceRecords(): Promise<ReconciliationResult[]> {
    const devices = await this.dbService.getDevices();
    const inspections = await this.dbService.getInspectionRecords();
    const certificates = await this.dbService.getCalibrationCertificates();
    const quotes = await this.dbService.getMaintenanceQuotes();

    const now = new Date();
    const results: ReconciliationResult[] = [];

    for (const device of devices) {
      const deviceInspections = inspections.filter(i => i.deviceCode === device.deviceCode);
      const deviceCertificates = certificates.filter(c => c.deviceCode === device.deviceCode);
      const deviceQuotes = quotes.filter(q => q.deviceCode === device.deviceCode);

      const lastInspection = deviceInspections.sort(
        (a, b) => b.inspectionDate.getTime() - a.inspectionDate.getTime()
      )[0];

      const validCertificates = deviceCertificates.filter(
        c => c.expiryDate > now && c.status === RecordStatus.CONFIRMED && c.conclusion === 'pass'
      );

      const latestCert = deviceCertificates.sort(
        (a, b) => b.expiryDate.getTime() - a.expiryDate.getTime()
      )[0];

      const issues: string[] = [];

      if (deviceInspections.length === 0) {
        issues.push('无巡检记录');
      }
      if (validCertificates.length === 0) {
        issues.push('无有效校准证书');
      }
      if (deviceQuotes.length === 0) {
        issues.push('无维修记录');
      }
      if (device.status === DeviceStatus.CERT_EXPIRED) {
        issues.push('证书已过期');
      }
      if (device.status === DeviceStatus.DEACTIVATED) {
        issues.push('设备已停用');
      }

      results.push({
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        hasInspection: deviceInspections.length > 0,
        hasValidCertificate: validCertificates.length > 0,
        hasMaintenance: deviceQuotes.length > 0,
        lastInspectionDate: lastInspection?.inspectionDate || null,
        certificateExpiryDate: latestCert?.expiryDate || null,
        issues
      });
    }

    return results;
  }

  async getStatusAuditTrail(entityType: string, entityId: string): Promise<any[]> {
    return this.dbService.getStatusLogs(entityType, entityId);
  }

  async exportToCSV<T>(data: T[], fields: string[], filename: string): Promise<string> {
    try {
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      console.error('CSV导出失败:', error);
      throw error;
    }
  }

  async exportDeviceStatusReport(): Promise<string> {
    const devices = await this.dbService.getDevices();
    const fields = ['deviceCode', 'deviceName', 'department', 'status', 'createdAt', 'updatedAt'];
    return this.exportToCSV(devices, fields, 'device-status-report.csv');
  }

  async exportInspectionReport(): Promise<string> {
    const records = await this.dbService.getInspectionRecords();
    const fields = [
      'recordNo', 'deviceCode', 'inspector', 'inspectionDate',
      'conclusion', 'status', 'createdBy', 'createdAt'
    ];
    return this.exportToCSV(records, fields, 'inspection-report.csv');
  }

  async exportCertificateReport(): Promise<string> {
    const certs = await this.dbService.getCalibrationCertificates();
    const fields = [
      'certificateNo', 'deviceCode', 'calibrationAgency', 'calibrationDate',
      'expiryDate', 'conclusion', 'status', 'createdBy'
    ];
    return this.exportToCSV(certs, fields, 'certificate-report.csv');
  }

  async exportReconciliationReport(): Promise<string> {
    const results = await this.reconcileDeviceRecords();
    const fields = [
      'deviceCode', 'deviceName', 'hasInspection', 'hasValidCertificate',
      'hasMaintenance', 'lastInspectionDate', 'certificateExpiryDate', 'issues'
    ];
    const data = results.map(r => ({
      ...r,
      issues: r.issues.join('; ')
    }));
    return this.exportToCSV(data, fields, 'reconciliation-report.csv');
  }
}