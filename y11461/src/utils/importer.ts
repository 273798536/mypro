import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { 
  MaterialRecord, 
  DataSource, 
  RecordStatus, 
  ImportResult,
  Database
} from '../types';
import { 
  generateId, 
  getCurrentTime, 
  addRecord, 
  addDirtyRecord,
  addStateChange
} from './database';
import { detectAllDirty } from './detector';

interface RawRecord {
  [key: string]: string;
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function transformImplantBatch(
  raw: RawRecord,
  sourceLine: number,
  sourceFile: string,
  importedBy: string
): MaterialRecord {
  return {
    id: generateId(),
    source: DataSource.IMPLANT_BATCH,
    sourceLine,
    sourceFile,
    batchNumber: raw['批号'] || raw['batchNumber'] || '',
    materialName: raw['材料名称'] || raw['materialName'] || raw['名称'] || '',
    materialType: raw['类型'] || raw['materialType'] || '种植体',
    quantity: parseNumber(raw['数量'] || raw['quantity']),
    unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
    totalAmount: parseNumber(raw['金额'] || raw['totalAmount'] || raw['总价']),
    supplier: raw['供应商'] || raw['supplier'] || '',
    importDate: getCurrentTime(),
    importedBy,
    status: RecordStatus.PENDING,
    createdAt: getCurrentTime(),
    updatedAt: getCurrentTime(),
    rawData: raw
  };
}

function transformAppointment(
  raw: RawRecord,
  sourceLine: number,
  sourceFile: string,
  importedBy: string
): MaterialRecord {
  return {
    id: generateId(),
    source: DataSource.APPOINTMENT,
    sourceLine,
    sourceFile,
    batchNumber: raw['种植体批号'] || raw['batchNumber'] || raw['批号'] || '',
    materialName: raw['材料名称'] || raw['materialName'] || '种植体',
    materialType: raw['类型'] || raw['materialType'] || '种植体',
    quantity: parseNumber(raw['数量'] || raw['quantity'] || '1'),
    unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
    totalAmount: parseNumber(raw['金额'] || raw['totalAmount']),
    supplier: raw['供应商'] || raw['supplier'] || '',
    patientId: raw['患者ID'] || raw['patientId'] || '',
    patientName: raw['患者姓名'] || raw['patientName'] || raw['姓名'] || '',
    appointmentDate: raw['预约日期'] || raw['appointmentDate'] || raw['日期'] || '',
    importDate: getCurrentTime(),
    importedBy,
    status: RecordStatus.PENDING,
    createdAt: getCurrentTime(),
    updatedAt: getCurrentTime(),
    rawData: raw
  };
}

function transformSupplierInvoice(
  raw: RawRecord,
  sourceLine: number,
  sourceFile: string,
  importedBy: string
): MaterialRecord {
  return {
    id: generateId(),
    source: DataSource.SUPPLIER_INVOICE,
    sourceLine,
    sourceFile,
    batchNumber: raw['批号'] || raw['batchNumber'] || '',
    materialName: raw['材料名称'] || raw['materialName'] || raw['货品名称'] || '',
    materialType: raw['类型'] || raw['materialType'] || '',
    quantity: parseNumber(raw['数量'] || raw['quantity']),
    unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
    totalAmount: parseNumber(raw['金额'] || raw['totalAmount'] || raw['总价']),
    supplier: raw['供应商'] || raw['supplier'] || raw['供货方'] || '',
    invoiceNumber: raw['发票号'] || raw['invoiceNumber'] || '',
    importDate: getCurrentTime(),
    importedBy,
    status: RecordStatus.PENDING,
    createdAt: getCurrentTime(),
    updatedAt: getCurrentTime(),
    rawData: raw
  };
}

function transformManualEntry(
  raw: RawRecord,
  sourceLine: number,
  sourceFile: string,
  importedBy: string
): MaterialRecord {
  return {
    id: generateId(),
    source: DataSource.MANUAL_ENTRY,
    sourceLine,
    sourceFile,
    batchNumber: raw['批号'] || raw['batchNumber'] || '',
    materialName: raw['材料名称'] || raw['materialName'] || '',
    materialType: raw['类型'] || raw['materialType'] || '',
    quantity: parseNumber(raw['数量'] || raw['quantity']),
    unitPrice: parseNumber(raw['单价'] || raw['unitPrice']),
    totalAmount: parseNumber(raw['金额'] || raw['totalAmount']),
    supplier: raw['供应商'] || raw['supplier'] || '',
    patientId: raw['患者ID'] || raw['patientId'] || '',
    patientName: raw['患者姓名'] || raw['patientName'] || '',
    appointmentDate: raw['日期'] || raw['appointmentDate'] || '',
    importDate: getCurrentTime(),
    importedBy,
    status: RecordStatus.PENDING,
    createdAt: getCurrentTime(),
    updatedAt: getCurrentTime(),
    rawData: raw
  };
}

function getTransformer(source: DataSource) {
  switch (source) {
    case DataSource.IMPLANT_BATCH:
      return transformImplantBatch;
    case DataSource.APPOINTMENT:
      return transformAppointment;
    case DataSource.SUPPLIER_INVOICE:
      return transformSupplierInvoice;
    case DataSource.MANUAL_ENTRY:
      return transformManualEntry;
    default:
      return transformManualEntry;
  }
}

export async function importCsvFile(
  filePath: string,
  source: DataSource,
  importedBy: string,
  db: Database
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const results: MaterialRecord[] = [];
    const errors: string[] = [];
    let lineNumber = 1;
    let dirtyCount = 0;

    if (!fs.existsSync(filePath)) {
      reject(new Error(`文件不存在: ${filePath}`));
      return;
    }

    const transformer = getTransformer(source);
    const fileName = path.basename(filePath);

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (raw: RawRecord) => {
        lineNumber++;
        try {
          const record = transformer(raw, lineNumber, fileName, importedBy);
          results.push(record);
        } catch (e: any) {
          errors.push(`第${lineNumber}行: ${e.message}`);
        }
      })
      .on('end', () => {
        const importedRecords: MaterialRecord[] = [];
        
        for (const record of results) {
          addRecord(db, record);
          
          const dirtyRecords = detectAllDirty(record, db);
          const fromStatus = record.status;
          
          if (dirtyRecords.length > 0) {
            record.status = RecordStatus.DIRTY;
            dirtyCount++;
            for (const dirty of dirtyRecords) {
              addDirtyRecord(db, dirty);
            }
            addStateChange(
              db, 
              record.id, 
              fromStatus, 
              RecordStatus.DIRTY, 
              importedBy, 
              `检测到${dirtyRecords.length}个问题`
            );
          } else {
            record.status = RecordStatus.IMPORTED;
            addStateChange(
              db, 
              record.id, 
              fromStatus, 
              RecordStatus.IMPORTED, 
              importedBy, 
              '数据校验通过'
            );
          }
          
          record.updatedAt = getCurrentTime();
          importedRecords.push(record);
        }

        resolve({
          total: results.length,
          success: results.length - errors.length,
          failed: errors.length,
          dirty: dirtyCount,
          records: importedRecords,
          errors
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export function getDataSourceName(source: DataSource): string {
  const names: Record<DataSource, string> = {
    [DataSource.IMPLANT_BATCH]: '种植体批号',
    [DataSource.APPOINTMENT]: '预约记录',
    [DataSource.SUPPLIER_INVOICE]: '供应商发票',
    [DataSource.MANUAL_ENTRY]: '临时补录单'
  };
  return names[source] ?? source;
}
