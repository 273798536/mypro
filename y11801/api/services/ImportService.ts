import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import { ImportLogRepository } from '../repositories/ImportLogRepository.js';
import { VehicleRepository } from '../repositories/VehicleRepository.js';
import { ContractRepository } from '../repositories/ContractRepository.js';
import { ResidualRepository } from '../repositories/ResidualRepository.js';
import { runInTransaction, db } from '../database/index.js';
import type {
  ImportLog,
  ImportDataType,
  VehicleRecord,
  LoanContract,
  ResidualTable,
} from '../../shared/types/index.js';

function generateId(): string {
  return crypto.randomUUID();
}

export class ImportService {
  private importLogRepository: ImportLogRepository;
  private vehicleRepository: VehicleRepository;
  private contractRepository: ContractRepository;
  private residualRepository: ResidualRepository;

  constructor() {
    this.importLogRepository = new ImportLogRepository();
    this.vehicleRepository = new VehicleRepository();
    this.contractRepository = new ContractRepository();
    this.residualRepository = new ResidualRepository();
  }

  async parseFile(filePath: string, dataType: ImportDataType): Promise<unknown[]> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      return this.parseCsv(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.parseExcel(filePath);
    } else {
      throw new Error('不支持的文件格式，仅支持 CSV 和 Excel 文件');
    }
  }

  private async parseCsv(filePath: string): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const results: unknown[] = [];

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data: unknown) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private parseExcel(filePath: string): unknown[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  }

  validateData(records: unknown[], dataType: ImportDataType): {
    valid: boolean;
    errors: string[];
    validRecords: unknown[];
  } {
    const errors: string[] = [];
    const validRecords: unknown[] = [];

    records.forEach((record, index) => {
      const row = record as Record<string, unknown>;
      const rowErrors: string[] = [];

      switch (dataType) {
        case 'vehicle':
          if (!row.vin) rowErrors.push('VIN 不能为空');
          if (!row.brand) rowErrors.push('品牌不能为空');
          if (!row.model) rowErrors.push('型号不能为空');
          if (row.purchasePrice === undefined && row['purchase_price'] === undefined) {
            rowErrors.push('购买价格不能为空');
          }
          if (row.storePrice === undefined && row['store_price'] === undefined) {
            rowErrors.push('门店收车价不能为空');
          }
          if (!row.storeId && !row['store_id']) rowErrors.push('门店ID不能为空');
          if (!row.storeName && !row['store_name']) rowErrors.push('门店名称不能为空');
          break;

        case 'contract':
          if (!row.contractNo && !row['contract_no']) rowErrors.push('合同号不能为空');
          if (!row.vin) rowErrors.push('VIN 不能为空');
          if (!row.customerName && !row['customer_name']) rowErrors.push('客户姓名不能为空');
          if (row.loanAmount === undefined && row['loan_amount'] === undefined) {
            rowErrors.push('贷款金额不能为空');
          }
          break;

        case 'residual':
          if (!row.vin) rowErrors.push('VIN 不能为空');
          if (row.residualValue === undefined && row['residual_value'] === undefined) {
            rowErrors.push('残值金额不能为空');
          }
          if (!row.residualDate && !row['residual_date']) rowErrors.push('残值评估日期不能为空');
          if (!row.expiryDate && !row['expiry_date']) rowErrors.push('残值过期日期不能为空');
          break;
      }

      if (rowErrors.length > 0) {
        errors.push(`第 ${index + 1} 行: ${rowErrors.join(', ')}`);
      } else {
        validRecords.push(record);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      validRecords,
    };
  }

  importData(
    records: unknown[],
    dataType: ImportDataType,
    fileName: string,
    operator: string
  ): ImportLog {
    const batchId = generateId();

    return runInTransaction(() => {
      const importLog = this.importLogRepository.create({
        batchId,
        dataType,
        fileName,
        recordCount: records.length,
        importedBy: operator,
        status: 'success',
      });

      for (const record of records) {
        const normalizedRecord = this.normalizeRecord(record as Record<string, unknown>, dataType);

        switch (dataType) {
          case 'vehicle':
            this.importVehicle(normalizedRecord, batchId);
            break;
          case 'contract':
            this.importContract(normalizedRecord, batchId);
            break;
          case 'residual':
            this.importResidual(normalizedRecord, batchId);
            break;
        }
      }

      return importLog;
    });
  }

  private normalizeRecord(record: Record<string, unknown>, dataType: ImportDataType): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    Object.entries(record).forEach(([key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      normalized[camelKey] = value;
    });

    return normalized;
  }

  private importVehicle(record: Record<string, unknown>, batchId: string): void {
    const now = new Date().toISOString();
    const existing = this.vehicleRepository.findByVin(String(record.vin));

    const vehicleData: Omit<VehicleRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      vin: String(record.vin),
      plateNumber: record.plateNumber ? String(record.plateNumber) : '',
      brand: String(record.brand),
      model: String(record.model),
      purchasePrice: Number(record.purchasePrice),
      storePrice: Number(record.storePrice),
      storePriceUpdatedAt: now,
      storeId: String(record.storeId),
      storeName: String(record.storeName),
      importBatchId: batchId,
    };

    if (existing) {
      this.vehicleRepository.update(existing.id, vehicleData);
    } else {
      this.vehicleRepository.create(vehicleData);
    }
  }

  private importContract(record: Record<string, unknown>, batchId: string): void {
    const existing = this.contractRepository.findByVin(String(record.vin));

    const contractData: Omit<LoanContract, 'id' | 'createdAt' | 'updatedAt'> = {
      contractNo: String(record.contractNo),
      vin: String(record.vin),
      customerName: String(record.customerName),
      loanAmount: Number(record.loanAmount),
      loanTerm: Number(record.loanTerm),
      interestRate: Number(record.interestRate),
      monthlyPayment: Number(record.monthlyPayment),
      remainingPrincipal: Number(record.remainingPrincipal),
      remainingInterest: Number(record.remainingInterest),
      startDate: String(record.startDate),
      endDate: String(record.endDate),
      isVehicleReplaced: Boolean(record.isVehicleReplaced),
      replacementReason: record.replacementReason ? String(record.replacementReason) : undefined,
      subsidyAmount: Number(record.subsidyAmount || 0),
      subsidyType: (record.subsidyType as 'national' | 'local' | 'dealer') || 'national',
      subsidyClawbackRequired: Boolean(record.subsidyClawbackRequired),
      clawbackAmount: record.clawbackAmount ? Number(record.clawbackAmount) : undefined,
      importBatchId: batchId,
    };

    if (existing) {
      this.contractRepository.update(existing.id, contractData);
    } else {
      this.contractRepository.create(contractData);
    }
  }

  private importResidual(record: Record<string, unknown>, batchId: string): void {
    const existing = this.residualRepository.findLatestByVin(String(record.vin));

    const residualData: Omit<ResidualTable, 'id' | 'createdAt' | 'updatedAt'> = {
      vin: String(record.vin),
      residualValue: Number(record.residualValue),
      residualDate: String(record.residualDate),
      expiryDate: String(record.expiryDate),
      valuationCompany: String(record.valuationCompany),
      isExpired: Boolean(record.isExpired),
      importBatchId: batchId,
    };

    if (existing) {
      this.residualRepository.update(existing.id, residualData);
    } else {
      this.residualRepository.create(residualData);
    }
  }

  getImportLogs(): ImportLog[] {
    return this.importLogRepository.findAllOrdered();
  }

  deleteImport(id: string): boolean {
    const importLog = this.importLogRepository.findById(id);
    if (!importLog) return false;

    const deletedCount = runInTransaction(() => {
      const batchId = importLog.batchId;

      db.prepare('DELETE FROM vehicle_record WHERE import_batch_id = ?').run(batchId);
      db.prepare('DELETE FROM loan_contract WHERE import_batch_id = ?').run(batchId);
      db.prepare('DELETE FROM residual_table WHERE import_batch_id = ?').run(batchId);

      return this.importLogRepository.deleteById(id);
    });

    return deletedCount > 0;
  }

  async processUpload(
    filePath: string,
    dataType: ImportDataType,
    fileName: string,
    operator: string
  ): Promise<ImportLog> {
    try {
      const records = await this.parseFile(filePath, dataType);
      const validation = this.validateData(records, dataType);

      if (!validation.valid && validation.validRecords.length === 0) {
        throw new Error(`数据校验失败: ${validation.errors.join('; ')}`);
      }

      const importLog = this.importData(
        validation.validRecords,
        dataType,
        fileName,
        operator
      );

      if (validation.errors.length > 0) {
        this.importLogRepository.updateStatus(
          importLog.id,
          'partial',
          validation.errors.join('; ')
        );
      }

      return importLog;
    } catch (error) {
      throw error;
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

export default ImportService;
