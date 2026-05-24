import fs from 'fs';
import csv from 'csv-parser';
import { DatabaseService } from '../db/service';
import { ImportSource, RecordStatus } from '../types';
import { InspectionRecordEntity } from '../models/InspectionRecord';
import { CalibrationCertificateEntity } from '../models/CalibrationCertificate';
import { MaintenanceQuoteEntity } from '../models/MaintenanceQuote';
import { SecondaryConfirmEntity } from '../models/SecondaryConfirm';

export interface ImportResult<T> {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  records: T[];
  errors: Array<{ row: number; error: string; data: any }>;
}

export class DataImportService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  private validateRequiredFields(data: any, requiredFields: string[]): string | null {
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === '') {
        return `缺少必填字段: ${field}`;
      }
    }
    return null;
  }

  private validateDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  async importInspectionRecordsFromCSV(
    filePath: string,
    importedBy: string
  ): Promise<ImportResult<InspectionRecordEntity>> {
    return this.importFromCSV(
      filePath,
      ImportSource.INSPECTION,
      importedBy,
      ['recordNo', 'deviceCode', 'inspector', 'inspectionDate', 'conclusion'],
      this.validateAndCreateInspectionRecord.bind(this)
    );
  }

  private async validateAndCreateInspectionRecord(
    data: any,
    _rowNum: number,
    createdBy: string
  ): Promise<InspectionRecordEntity> {
    const device = await this.dbService.findDeviceByCode(data.deviceCode);
    if (!device) {
      throw new Error(`设备不存在: ${data.deviceCode}`);
    }

    const inspectionDate = this.validateDate(data.inspectionDate);
    if (!inspectionDate) {
      throw new Error(`无效的巡检日期: ${data.inspectionDate}`);
    }

    const inspectionItems: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('item_')) {
        inspectionItems[key.replace('item_', '')] = value;
      }
    }

    return this.dbService.createInspectionRecord({
      recordNo: data.recordNo,
      deviceId: device.id,
      deviceCode: data.deviceCode,
      inspector: data.inspector,
      inspectionDate,
      inspectionItems,
      conclusion: data.conclusion,
      remarks: data.remarks || '',
      status: RecordStatus.DRAFT,
      createdBy
    });
  }

  async importCalibrationCertificatesFromCSV(
    filePath: string,
    importedBy: string
  ): Promise<ImportResult<CalibrationCertificateEntity>> {
    return this.importFromCSV(
      filePath,
      ImportSource.CALIBRATION,
      importedBy,
      ['certificateNo', 'deviceCode', 'calibrationAgency', 'calibrationDate', 'expiryDate', 'conclusion'],
      this.validateAndCreateCalibrationCertificate.bind(this)
    );
  }

  private async validateAndCreateCalibrationCertificate(
    data: any,
    _rowNum: number,
    createdBy: string
  ): Promise<CalibrationCertificateEntity> {
    const device = await this.dbService.findDeviceByCode(data.deviceCode);
    if (!device) {
      throw new Error(`设备不存在: ${data.deviceCode}`);
    }

    const calibrationDate = this.validateDate(data.calibrationDate);
    if (!calibrationDate) {
      throw new Error(`无效的校准日期: ${data.calibrationDate}`);
    }

    const expiryDate = this.validateDate(data.expiryDate);
    if (!expiryDate) {
      throw new Error(`无效的过期日期: ${data.expiryDate}`);
    }

    if (!['pass', 'fail', 'conditional'].includes(data.conclusion)) {
      throw new Error(`结论必须是 pass、fail 或 conditional: ${data.conclusion}`);
    }

    const calibrationItems = data.calibrationItems
      ? data.calibrationItems.split('|').map((s: string) => s.trim())
      : [];

    return this.dbService.createCalibrationCertificate({
      certificateNo: data.certificateNo,
      deviceId: device.id,
      deviceCode: data.deviceCode,
      calibrationAgency: data.calibrationAgency,
      calibrationDate,
      expiryDate,
      calibrationItems,
      conclusion: data.conclusion,
      fileUrl: data.fileUrl || '',
      status: RecordStatus.DRAFT,
      createdBy
    });
  }

  async importMaintenanceQuotesFromCSV(
    filePath: string,
    importedBy: string
  ): Promise<ImportResult<MaintenanceQuoteEntity>> {
    return this.importFromCSV(
      filePath,
      ImportSource.MAINTENANCE_QUOTE,
      importedBy,
      ['quoteNo', 'deviceCode', 'vendor', 'quoteDate', 'estimatedCost'],
      this.validateAndCreateMaintenanceQuote.bind(this)
    );
  }

  private async validateAndCreateMaintenanceQuote(
    data: any,
    _rowNum: number,
    createdBy: string
  ): Promise<MaintenanceQuoteEntity> {
    const device = await this.dbService.findDeviceByCode(data.deviceCode);
    if (!device) {
      throw new Error(`设备不存在: ${data.deviceCode}`);
    }

    const quoteDate = this.validateDate(data.quoteDate);
    if (!quoteDate) {
      throw new Error(`无效的报价日期: ${data.quoteDate}`);
    }

    const estimatedCost = parseFloat(data.estimatedCost);
    if (isNaN(estimatedCost) || estimatedCost < 0) {
      throw new Error(`无效的预估费用: ${data.estimatedCost}`);
    }

    const maintenanceItems = data.maintenanceItems
      ? data.maintenanceItems.split('|').map((s: string) => s.trim())
      : [];

    return this.dbService.createMaintenanceQuote({
      quoteNo: data.quoteNo,
      deviceId: device.id,
      deviceCode: data.deviceCode,
      vendor: data.vendor,
      quoteDate,
      estimatedCost,
      maintenanceItems,
      status: RecordStatus.DRAFT,
      approvalStatus: 'pending',
      createdBy
    });
  }

  async importSecondaryConfirmsFromCSV(
    filePath: string,
    importedBy: string
  ): Promise<ImportResult<SecondaryConfirmEntity>> {
    return this.importFromCSV(
      filePath,
      ImportSource.SECONDARY_CONFIRM,
      importedBy,
      ['confirmNo', 'relatedRecordType', 'relatedRecordId', 'deviceCode', 'confirmer', 'confirmDate', 'confirmContent'],
      this.validateAndCreateSecondaryConfirm.bind(this)
    );
  }

  private async validateAndCreateSecondaryConfirm(
    data: any,
    _rowNum: number,
    createdBy: string
  ): Promise<SecondaryConfirmEntity> {
    const device = await this.dbService.findDeviceByCode(data.deviceCode);
    if (!device) {
      throw new Error(`设备不存在: ${data.deviceCode}`);
    }

    const confirmDate = this.validateDate(data.confirmDate);
    if (!confirmDate) {
      throw new Error(`无效的确认日期: ${data.confirmDate}`);
    }

    const validTypes = ['inspection', 'calibration', 'maintenance_quote', 'secondary_confirm'];
    if (!validTypes.includes(data.relatedRecordType)) {
      throw new Error(`关联记录类型无效: ${data.relatedRecordType}`);
    }

    return this.dbService.createSecondaryConfirm({
      confirmNo: data.confirmNo,
      relatedRecordType: data.relatedRecordType,
      relatedRecordId: data.relatedRecordId,
      deviceId: device.id,
      deviceCode: data.deviceCode,
      confirmer: data.confirmer,
      confirmDate,
      confirmContent: data.confirmContent,
      status: RecordStatus.DRAFT,
      createdBy
    });
  }

  private async importFromCSV<T>(
    filePath: string,
    source: ImportSource,
    importedBy: string,
    requiredFields: string[],
    createRecord: (data: any, rowNum: number, createdBy: string) => Promise<T>
  ): Promise<ImportResult<T>> {
    const results: T[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (data) => {
          rowNumber++;
          try {
            const fieldError = this.validateRequiredFields(data, requiredFields);
            if (fieldError) {
              throw new Error(fieldError);
            }

            const record = await createRecord(data, rowNumber, importedBy);
            results.push(record);
          } catch (error: any) {
            errors.push({
              row: rowNumber,
              error: error.message,
              data
            });

            await this.dbService.createImportFailure(
              source,
              rowNumber,
              JSON.stringify(data),
              error.message,
              importedBy
            );
          }
        })
        .on('end', () => {
          resolve({
            success: errors.length === 0,
            total: rowNumber,
            imported: results.length,
            failed: errors.length,
            records: results,
            errors
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }
}