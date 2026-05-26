import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import {
  ReconciliationReceiptModel,
  OriginalEvidenceModel,
  ImportBatchModel,
  StatusTransitionModel
} from '../models';
import {
  DataSourceType,
  Operator,
  ReceiptStatus,
  ImportResult,
  ImportError
} from '../types';
import { logger } from '../utils/logger';

export interface ParsedRecord {
  batchNo: string;
  semiProductCode: string;
  semiProductName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  abnormalAmount: number;
  deductionAmount: number;
  customerServiceNotes?: string;
  sourceType: DataSourceType;
}

export interface ParseOptions {
  skipHeader?: boolean;
  sheetName?: string;
}

interface ColumnMapping {
  batchNo: number;
  semiProductCode?: number;
  semiProductName?: number;
  supplierId?: number;
  supplierName?: number;
  quantity?: number;
  abnormalAmount?: number;
  deductionAmount?: number;
  customerServiceNotes?: number;
}

const COLUMN_MAPPINGS: Record<DataSourceType, ColumnMapping> = {
  [DataSourceType.DELIVERY_NOTE]: {
    batchNo: 0,
    semiProductCode: 1,
    semiProductName: 2,
    supplierId: 3,
    supplierName: 4,
    quantity: 5,
    abnormalAmount: 6,
    deductionAmount: 7,
    customerServiceNotes: 8
  },
  [DataSourceType.REPAIR_RECORD]: {
    batchNo: 0,
    quantity: 4,
    abnormalAmount: 5,
    customerServiceNotes: 3
  },
  [DataSourceType.DEDUCTION_DETAIL]: {
    batchNo: 0,
    deductionAmount: 4,
    customerServiceNotes: 5
  },
  [DataSourceType.STORE_HANDOVER]: {
    batchNo: 0,
    quantity: 1,
    customerServiceNotes: 2
  },
  [DataSourceType.CUSTOMER_SERVICE_NOTE]: {
    batchNo: 0,
    customerServiceNotes: 1
  }
};

const DEFAULT_VALUES = {
  semiProductCode: 'UNKNOWN',
  semiProductName: '未知半成品',
  supplierId: 'UNKNOWN',
  supplierName: '未知供应商',
  quantity: 0,
  abnormalAmount: 0,
  deductionAmount: 0
};

export class DataImportService {
  private receiptModel: ReconciliationReceiptModel;
  private evidenceModel: OriginalEvidenceModel;
  private batchModel: ImportBatchModel;
  private transitionModel: StatusTransitionModel;

  constructor() {
    this.receiptModel = new ReconciliationReceiptModel();
    this.evidenceModel = new OriginalEvidenceModel();
    this.batchModel = new ImportBatchModel();
    this.transitionModel = new StatusTransitionModel();
  }

  async importFromFile(
    filePath: string,
    sourceType: DataSourceType,
    operator: Operator,
    options: ParseOptions = {}
  ): Promise<ImportResult> {
    const sourceFile = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();

    let records: ParsedRecord[] = [];
    let errors: ImportError[] = [];

    try {
      if (fileExt === '.xlsx' || fileExt === '.xls') {
        ({ records, errors } = this.parseExcel(filePath, sourceFile, sourceType, options));
      } else if (fileExt === '.csv') {
        ({ records, errors } = await this.parseCsv(filePath, sourceFile, sourceType, options));
      } else {
        throw new Error(`不支持的文件格式: ${fileExt}`);
      }
    } catch (error) {
      logger.error('文件解析失败:', error);
      throw error;
    }

    const batchResult = await this.batchModel.create({
      sourceFile,
      sourceType,
      totalRecords: records.length + errors.length,
      importedBy: operator
    });

    const createdReceiptIds: string[] = [];
    let successCount = 0;
    let failedCount = errors.length;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const lineNumber = options.skipHeader ? i + 2 : i + 1;

      try {
        const receipt = await this.processRecord(
          record,
          sourceFile,
          lineNumber,
          sourceType,
          batchResult.id,
          operator
        );
        createdReceiptIds.push(receipt.id);
        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({
          sourceFile,
          lineNumber,
          fieldName: 'system',
          originalValue: JSON.stringify(record),
          errorMessage: error.message,
          errorCode: 'PROCESS_ERROR'
        });
      }
    }

    await this.batchModel.updateResult(
      batchResult.id,
      successCount,
      failedCount,
      errors.length > 0 ? JSON.stringify(errors) : undefined
    );

    return {
      success: failedCount === 0,
      batchId: batchResult.id,
      totalRecords: records.length + errors.length,
      successCount,
      failedCount,
      errors,
      createdReceiptIds
    };
  }

  private parseExcel(
    filePath: string,
    sourceFile: string,
    sourceType: DataSourceType,
    options: ParseOptions
  ): { records: ParsedRecord[]; errors: ImportError[] } {
    const records: ParsedRecord[] = [];
    const errors: ImportError[] = [];

    const workbook = XLSX.readFile(filePath);
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const startRow = options.skipHeader ? 1 : 0;

    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      const lineNumber = i + 1;

      try {
        const record = this.parseRow(row, sourceFile, lineNumber, sourceType);
        records.push(record);
      } catch (error: any) {
        errors.push({
          sourceFile,
          lineNumber,
          fieldName: error.fieldName || 'unknown',
          originalValue: error.originalValue || '',
          errorMessage: error.message,
          errorCode: error.code || 'PARSE_ERROR'
        });
      }
    }

    return { records, errors };
  }

  private async parseCsv(
    filePath: string,
    sourceFile: string,
    sourceType: DataSourceType,
    options: ParseOptions
  ): Promise<{ records: ParsedRecord[]; errors: ImportError[] }> {
    return new Promise((resolve, reject) => {
      const records: ParsedRecord[] = [];
      const errors: ImportError[] = [];
      let lineNumber = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: Record<string, any>) => {
          lineNumber++;
          if (options.skipHeader && lineNumber === 1) return;

          try {
            const record = this.parseRow(Object.values(row), sourceFile, lineNumber, sourceType);
            records.push(record);
          } catch (error: any) {
            errors.push({
              sourceFile,
              lineNumber,
              fieldName: error.fieldName || 'unknown',
              originalValue: error.originalValue || '',
              errorMessage: error.message,
              errorCode: error.code || 'PARSE_ERROR'
            });
          }
        })
        .on('end', () => {
          resolve({ records, errors });
        })
        .on('error', reject);
    });
  }

  private parseRow(row: any[], sourceFile: string, lineNumber: number, sourceType: DataSourceType): ParsedRecord {
    const mapping = COLUMN_MAPPINGS[sourceType] || COLUMN_MAPPINGS[DataSourceType.DELIVERY_NOTE];
    
    const getValue = (index: number | undefined, fieldName: string, required: boolean = false, defaultValue: any = ''): any => {
      if (index === undefined) return defaultValue;
      const value = row[index];
      if (required && (value === undefined || value === null || value === '')) {
        const error: any = new Error(`字段 ${fieldName} 不能为空`);
        error.fieldName = fieldName;
        error.originalValue = value;
        error.code = 'MISSING_REQUIRED';
        throw error;
      }
      return value ?? defaultValue;
    };

    const parseNumber = (value: any, fieldName: string): number => {
      if (value === null || value === undefined || value === '') return 0;
      const num = Number(value);
      if (isNaN(num)) {
        const error: any = new Error(`字段 ${fieldName} 必须是数字`);
        error.fieldName = fieldName;
        error.originalValue = value;
        error.code = 'INVALID_NUMBER';
        throw error;
      }
      return num;
    };

    try {
      const record: ParsedRecord = {
        batchNo: String(getValue(mapping.batchNo, '批次号', true)),
        semiProductCode: String(getValue(mapping.semiProductCode, '半成品编码', false, DEFAULT_VALUES.semiProductCode)),
        semiProductName: String(getValue(mapping.semiProductName, '半成品名称', false, DEFAULT_VALUES.semiProductName)),
        supplierId: String(getValue(mapping.supplierId, '供应商ID', false, DEFAULT_VALUES.supplierId)),
        supplierName: String(getValue(mapping.supplierName, '供应商名称', false, DEFAULT_VALUES.supplierName)),
        quantity: parseNumber(getValue(mapping.quantity, '数量', false, 0), '数量'),
        abnormalAmount: parseNumber(getValue(mapping.abnormalAmount, '异常金额', false, 0), '异常金额'),
        deductionAmount: parseNumber(getValue(mapping.deductionAmount, '扣款金额', false, 0), '扣款金额'),
        customerServiceNotes: mapping.customerServiceNotes !== undefined && row[mapping.customerServiceNotes] ? String(row[mapping.customerServiceNotes]) : undefined,
        sourceType
      };
      return record;
    } catch (error: any) {
      logger.error(`行 ${lineNumber} 解析失败:`, error.message);
      throw error;
    }
  }

  private async processRecord(
    record: ParsedRecord,
    sourceFile: string,
    lineNumber: number,
    sourceType: DataSourceType,
    importBatchId: string,
    operator: Operator
  ) {
    const existingReceipts = await this.receiptModel.findByBatchNo(record.batchNo);
    
    let receipt: any;
    
    if (existingReceipts.length > 0) {
      receipt = existingReceipts[0];
      logger.warn(`批次 ${record.batchNo} 已存在，将追加证据记录并累加金额`);
      
      const updatedAmounts = {
        quantity: receipt.quantity + record.quantity,
        abnormalAmount: receipt.abnormalAmount + record.abnormalAmount,
        deductionAmount: receipt.deductionAmount + record.deductionAmount
      };
      
      const notesParts = [receipt.customerServiceNotes, record.customerServiceNotes].filter(Boolean);
      const mergedNotes = notesParts.length > 0 ? notesParts.join('; ') : undefined;
      
      receipt = await this.receiptModel.updateStatus(
        receipt.id,
        receipt.status,
        operator,
        `追加${this.getSourceTypeName(sourceType)}数据`,
        {
          ...updatedAmounts,
          customerServiceNotes: mergedNotes || receipt.customerServiceNotes
        }
      );
      
      await this.transitionModel.create({
        receiptId: receipt.id,
        fromStatus: receipt.status,
        toStatus: receipt.status,
        operator,
        reason: `追加${this.getSourceTypeName(sourceType)}数据，累加金额`,
        metadata: {
          sourceType,
          sourceFile,
          importBatchId,
          addedQuantity: record.quantity,
          addedAbnormalAmount: record.abnormalAmount,
          addedDeductionAmount: record.deductionAmount
        }
      });
    } else {
      receipt = await this.receiptModel.create({
        batchNo: record.batchNo,
        semiProductCode: record.semiProductCode,
        semiProductName: record.semiProductName,
        supplierId: record.supplierId,
        supplierName: record.supplierName,
        status: ReceiptStatus.DRAFT,
        currentStatus: ReceiptStatus.DRAFT,
        quantity: record.quantity,
        abnormalAmount: record.abnormalAmount,
        deductionAmount: record.deductionAmount,
        confirmedAmount: 0,
        customerServiceNotes: record.customerServiceNotes,
        isManualModified: false,
        createdBy: operator
      });

      await this.transitionModel.create({
        receiptId: receipt.id,
        fromStatus: ReceiptStatus.DRAFT,
        toStatus: ReceiptStatus.DRAFT,
        operator,
        reason: '数据导入创建',
        metadata: { sourceType, sourceFile, importBatchId }
      });
    }

    const fieldsToMap = [
      { fieldName: 'batchNo', originalValue: record.batchNo },
      { fieldName: 'semiProductCode', originalValue: record.semiProductCode },
      { fieldName: 'semiProductName', originalValue: record.semiProductName },
      { fieldName: 'supplierId', originalValue: record.supplierId },
      { fieldName: 'supplierName', originalValue: record.supplierName },
      { fieldName: 'quantity', originalValue: String(record.quantity) },
      { fieldName: 'abnormalAmount', originalValue: String(record.abnormalAmount) },
      { fieldName: 'deductionAmount', originalValue: String(record.deductionAmount) }
    ];

    for (const field of fieldsToMap) {
      await this.evidenceModel.create({
        receiptId: receipt.id,
        sourceType,
        sourceFile,
        originalLineNumber: lineNumber,
        originalValue: field.originalValue,
        parsedValue: field.originalValue,
        fieldName: field.fieldName,
        importBatchId
      });
    }

    return receipt;
  }

  async mergeAdditionalData(
    receiptId: string,
    sourceType: DataSourceType,
    sourceFile: string,
    data: Record<string, any>,
    operator: Operator
  ): Promise<void> {
    const batchId = uuidv4();
    let lineNumber = 1;

    for (const [fieldName, value] of Object.entries(data)) {
      await this.evidenceModel.create({
        receiptId,
        sourceType,
        sourceFile,
        originalLineNumber: lineNumber++,
        originalValue: String(value),
        parsedValue: String(value),
        fieldName,
        importBatchId: batchId
      });
    }

    logger.info(`已为回执 ${receiptId} 追加 ${Object.keys(data).length} 条证据记录`);
  }

  private getSourceTypeName(sourceType: DataSourceType): string {
    const names: Record<DataSourceType, string> = {
      [DataSourceType.DELIVERY_NOTE]: '送货单',
      [DataSourceType.REPAIR_RECORD]: '返修记录',
      [DataSourceType.DEDUCTION_DETAIL]: '扣款明细',
      [DataSourceType.STORE_HANDOVER]: '门店交接',
      [DataSourceType.CUSTOMER_SERVICE_NOTE]: '客服备注'
    };
    return names[sourceType] || sourceType;
  }
}
