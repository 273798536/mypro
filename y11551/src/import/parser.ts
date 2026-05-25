import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { SourceType, RecordStatus } from '../types';

export interface ParsedRecord {
  originalLineNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  failureReason?: string;
}

export interface ParseResult {
  records: ParsedRecord[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
  sourceType: SourceType;
}

function detectSourceType(fileName: string): SourceType {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('库存') || lowerName.includes('inventory') || lowerName.includes('stock')) {
    return SourceType.CABINET_INVENTORY;
  }
  if (lowerName.includes('补货') || lowerName.includes('restock')) {
    return SourceType.RESTOCK_PHOTO;
  }
  if (lowerName.includes('退款') || lowerName.includes('refund')) {
    return SourceType.REFUND_RECORD;
  }
  if (lowerName.includes('异常') || lowerName.includes('exception')) {
    return SourceType.EXCEPTION_PHOTO;
  }
  if (lowerName.includes('短信') || lowerName.includes('sms')) {
    return SourceType.SMS_SCREENSHOT;
  }
  
  throw new Error(`无法识别文件类型: ${fileName}，请在文件名中包含"库存/补货/退款/异常/短信"关键字`);
}

function validateCabinetInventory(row: any, lineNumber: number): ParsedRecord {
  const errors: string[] = [];
  
  if (!row['柜机ID'] && !row['cabinet_id'] && !row['柜机编号']) {
    errors.push('缺少柜机ID');
  }
  if (!row['格口ID'] && !row['slot_id'] && !row['格口编号']) {
    errors.push('缺少格口ID');
  }
  if (!row['SKU ID'] && !row['sku_id'] && !row['商品ID']) {
    errors.push('缺少SKU ID');
  }
  if (row['库存数量'] === undefined && row['stock_quantity'] === undefined) {
    errors.push('缺少库存数量');
  }
  if (!row['记录时间'] && !row['record_time']) {
    errors.push('缺少记录时间');
  }
  
  return {
    originalLineNumber: lineNumber,
    data: row,
    isValid: errors.length === 0,
    failureReason: errors.length > 0 ? errors.join('; ') : undefined
  };
}

function validateRestockPhoto(row: any, lineNumber: number): ParsedRecord {
  const errors: string[] = [];
  
  if (!row['柜机ID'] && !row['cabinet_id']) {
    errors.push('缺少柜机ID');
  }
  if (!row['拍照时间'] && !row['photo_time']) {
    errors.push('缺少拍照时间');
  }
  
  return {
    originalLineNumber: lineNumber,
    data: row,
    isValid: errors.length === 0,
    failureReason: errors.length > 0 ? errors.join('; ') : undefined
  };
}

function validateRefundRecord(row: any, lineNumber: number): ParsedRecord {
  const errors: string[] = [];
  
  if (!row['订单ID'] && !row['order_id']) {
    errors.push('缺少订单ID');
  }
  if (!row['柜机ID'] && !row['cabinet_id']) {
    errors.push('缺少柜机ID');
  }
  if (!row['退款时间'] && !row['refund_time']) {
    errors.push('缺少退款时间');
  }
  
  return {
    originalLineNumber: lineNumber,
    data: row,
    isValid: errors.length === 0,
    failureReason: errors.length > 0 ? errors.join('; ') : undefined
  };
}

function validateExceptionPhoto(row: any, lineNumber: number): ParsedRecord {
  const errors: string[] = [];
  
  if (!row['柜机ID'] && !row['cabinet_id']) {
    errors.push('缺少柜机ID');
  }
  if (!row['异常时间'] && !row['exception_time']) {
    errors.push('缺少异常时间');
  }
  
  return {
    originalLineNumber: lineNumber,
    data: row,
    isValid: errors.length === 0,
    failureReason: errors.length > 0 ? errors.join('; ') : undefined
  };
}

function validateSmsScreenshot(row: any, lineNumber: number): ParsedRecord {
  const errors: string[] = [];
  
  if (!row['柜机ID'] && !row['cabinet_id']) {
    errors.push('缺少柜机ID');
  }
  if (!row['发送时间'] && !row['send_time']) {
    errors.push('缺少发送时间');
  }
  
  return {
    originalLineNumber: lineNumber,
    data: row,
    isValid: errors.length === 0,
    failureReason: errors.length > 0 ? errors.join('; ') : undefined
  };
}

export function getValidator(sourceType: SourceType) {
  switch (sourceType) {
    case SourceType.CABINET_INVENTORY:
      return validateCabinetInventory;
    case SourceType.RESTOCK_PHOTO:
      return validateRestockPhoto;
    case SourceType.REFUND_RECORD:
      return validateRefundRecord;
    case SourceType.EXCEPTION_PHOTO:
      return validateExceptionPhoto;
    case SourceType.SMS_SCREENSHOT:
      return validateSmsScreenshot;
  }
}

export function parseCsvFile(filePath: string, sourceType?: SourceType): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const results: ParsedRecord[] = [];
    const fileName = path.basename(filePath);
    const detectedType = sourceType || detectSourceType(fileName);
    const validator = getValidator(detectedType);
    
    let lineNumber = 1;
    
    fs.createReadStream(filePath, { encoding: 'utf-8' })
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        const record = validator(row, lineNumber);
        results.push(record);
      })
      .on('end', () => {
        const validCount = results.filter(r => r.isValid).length;
        resolve({
          records: results,
          totalCount: results.length,
          validCount,
          invalidCount: results.length - validCount,
          sourceType: detectedType
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export function parseExcelFile(filePath: string, sourceType?: SourceType): Promise<ParseResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const fileName = path.basename(filePath);
      const detectedType = sourceType || detectSourceType(fileName);
      const validator = getValidator(detectedType);
      
      const results: ParsedRecord[] = [];
      
      workbook.eachSheet((worksheet: any) => {
        const rows: any[] = [];
        let headers: string[] = [];
        
        worksheet.eachRow((row: any, rowNumber: number) => {
          if (rowNumber === 1) {
            headers = row.values as string[];
          } else {
            const obj: Record<string, any> = {};
            row.eachCell((cell: any, colNumber: number) => {
              const header = headers[colNumber] || `col_${colNumber}`;
              obj[header] = cell.value;
            });
            rows.push(obj);
          }
        });
        
        rows.forEach((row, index) => {
          const record = validator(row, index + 2);
          results.push(record);
        });
      });
      
      const validCount = results.filter(r => r.isValid).length;
      resolve({
        records: results,
        totalCount: results.length,
        validCount,
        invalidCount: results.length - validCount,
        sourceType: detectedType
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function parseFile(filePath: string, sourceType?: SourceType): Promise<ParseResult> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.csv') {
    return parseCsvFile(filePath, sourceType);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return parseExcelFile(filePath, sourceType);
  } else {
    throw new Error(`不支持的文件格式: ${ext}，仅支持 .csv, .xlsx, .xls`);
  }
}

export function mapCabinetInventoryData(row: any, batchId: string): any {
  return {
    batchId,
    originalLineNumber: row.originalLineNumber,
    cabinetId: row.data['柜机ID'] || row.data['cabinet_id'] || row.data['柜机编号'],
    cabinetName: row.data['柜机名称'] || row.data['cabinet_name'],
    city: row.data['城市'] || row.data['city'],
    slotId: row.data['格口ID'] || row.data['slot_id'] || row.data['格口编号'],
    slotName: row.data['格口名称'] || row.data['slot_name'],
    skuId: row.data['SKU ID'] || row.data['sku_id'] || row.data['商品ID'],
    skuName: row.data['SKU名称'] || row.data['sku_name'] || row.data['商品名称'],
    stockQuantity: parseInt(row.data['库存数量'] || row.data['stock_quantity'] || '0', 10),
    maxCapacity: parseInt(row.data['最大容量'] || row.data['max_capacity'] || '0', 10),
    isHotSku: (row.data['是否热销'] || row.data['is_hot_sku'] || '').toString().toLowerCase() === '是' || 
              (row.data['是否热销'] || row.data['is_hot_sku']) === true,
    isFull: (row.data['是否满仓'] || row.data['is_full'] || '').toString().toLowerCase() === '是' || 
            (row.data['是否满仓'] || row.data['is_full']) === true,
    recordTime: row.data['记录时间'] || row.data['record_time'],
    status: row.isValid ? RecordStatus.VALID : RecordStatus.INVALID,
    failureReason: row.failureReason
  };
}

export function mapRestockPhotoData(row: any, batchId: string): any {
  return {
    batchId,
    originalLineNumber: row.originalLineNumber,
    cabinetId: row.data['柜机ID'] || row.data['cabinet_id'],
    photoPath: row.data['照片路径'] || row.data['photo_path'],
    photoTime: row.data['拍照时间'] || row.data['photo_time'],
    restockQuantity: parseInt(row.data['补货数量'] || row.data['restock_quantity'] || '0', 10),
    operator: row.data['操作人'] || row.data['operator'],
    status: row.isValid ? RecordStatus.VALID : RecordStatus.INVALID,
    failureReason: row.failureReason
  };
}

export function mapRefundRecordData(row: any, batchId: string): any {
  return {
    batchId,
    originalLineNumber: row.originalLineNumber,
    orderId: row.data['订单ID'] || row.data['order_id'],
    cabinetId: row.data['柜机ID'] || row.data['cabinet_id'],
    skuId: row.data['SKU ID'] || row.data['sku_id'],
    refundAmount: parseFloat(row.data['退款金额'] || row.data['refund_amount'] || '0'),
    refundTime: row.data['退款时间'] || row.data['refund_time'],
    refundReason: row.data['退款原因'] || row.data['refund_reason'],
    status: row.isValid ? RecordStatus.VALID : RecordStatus.INVALID,
    failureReason: row.failureReason
  };
}

export function mapExceptionPhotoData(row: any, batchId: string): any {
  return {
    batchId,
    originalLineNumber: row.originalLineNumber,
    cabinetId: row.data['柜机ID'] || row.data['cabinet_id'],
    photoPath: row.data['照片路径'] || row.data['photo_path'],
    exceptionType: row.data['异常类型'] || row.data['exception_type'],
    exceptionTime: row.data['异常时间'] || row.data['exception_time'],
    description: row.data['描述'] || row.data['description'],
    status: row.isValid ? RecordStatus.VALID : RecordStatus.INVALID,
    failureReason: row.failureReason
  };
}

export function mapSmsScreenshotData(row: any, batchId: string): any {
  return {
    batchId,
    originalLineNumber: row.originalLineNumber,
    cabinetId: row.data['柜机ID'] || row.data['cabinet_id'],
    smsContent: row.data['短信内容'] || row.data['sms_content'],
    sendTime: row.data['发送时间'] || row.data['send_time'],
    phoneNumber: row.data['手机号'] || row.data['phone_number'],
    status: row.isValid ? RecordStatus.VALID : RecordStatus.INVALID,
    failureReason: row.failureReason
  };
}

export function getDataMapper(sourceType: SourceType) {
  switch (sourceType) {
    case SourceType.CABINET_INVENTORY:
      return mapCabinetInventoryData;
    case SourceType.RESTOCK_PHOTO:
      return mapRestockPhotoData;
    case SourceType.REFUND_RECORD:
      return mapRefundRecordData;
    case SourceType.EXCEPTION_PHOTO:
      return mapExceptionPhotoData;
    case SourceType.SMS_SCREENSHOT:
      return mapSmsScreenshotData;
  }
}
