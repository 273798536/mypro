import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { DefectRecord, ImportResult } from '../types';

function validateRecord(record: Partial<DefectRecord>, index: number): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record.defectType) {
    errors.push(`第 ${index + 1} 行: 缺少缺陷类型`);
  }
  if (!record.category) {
    errors.push(`第 ${index + 1} 行: 缺少类别`);
  }
  if (record.count === undefined || record.count === null || isNaN(Number(record.count))) {
    errors.push(`第 ${index + 1} 行: 数量无效`);
  } else if (Number(record.count) < 0) {
    errors.push(`第 ${index + 1} 行: 数量不能为负数`);
  }

  if (!record.materialSource) {
    warnings.push(`第 ${index + 1} 行: 建议填写材料来源`);
  }
  if (!record.batchId) {
    warnings.push(`第 ${index + 1} 行: 建议填写批次号`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function parseCSVFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const records: DefectRecord[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: unknown, index: number) => {
          const data = row as Record<string, string>;
          const rawRecord: Partial<DefectRecord> = {
            id: `record-${Date.now()}-${index}`,
            projectId: '',
            batchId: data['批次号'] || data['batchId'] || data['batch_id'] || '',
            defectType: data['缺陷类型'] || data['defectType'] || data['defect_type'] || '',
            category: data['类别'] || data['category'] || '',
            count: Number(data['数量'] || data['count'] || 0),
            materialSource: data['材料来源'] || data['materialSource'] || data['material_source'] || '',
            productionLine: data['生产线'] || data['productionLine'] || data['production_line'] || '',
            shift: data['班次'] || data['shift'] || '',
            recordDate: parseDate(data['记录日期'] || data['recordDate'] || data['record_date']),
            remarks: data['备注'] || data['remarks'] || ''
          };

          const { valid, errors, warnings } = validateRecord(rawRecord, index);
          allErrors.push(...errors);
          allWarnings.push(...warnings);

          if (valid) {
            records.push(rawRecord as DefectRecord);
          }
        });

        resolve({
          success: allErrors.length === 0 && records.length > 0,
          records,
          errors: allErrors,
          warnings: allWarnings
        });
      },
      error: (error) => {
        resolve({
          success: false,
          records: [],
          errors: [`CSV 解析错误: ${error.message}`],
          warnings: []
        });
      }
    });
  });
}

export async function parseExcelFile(file: File): Promise<ImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    const records: DefectRecord[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    jsonData.forEach((row, index) => {
      const rawRecord: Partial<DefectRecord> = {
        id: `record-${Date.now()}-${index}`,
        projectId: '',
        batchId: String(row['批次号'] || row['batchId'] || row['batch_id'] || ''),
        defectType: String(row['缺陷类型'] || row['defectType'] || row['defect_type'] || ''),
        category: String(row['类别'] || row['category'] || ''),
        count: Number(row['数量'] || row['count'] || 0),
        materialSource: String(row['材料来源'] || row['materialSource'] || row['material_source'] || ''),
        productionLine: String(row['生产线'] || row['productionLine'] || row['production_line'] || ''),
        shift: String(row['班次'] || row['shift'] || ''),
        recordDate: parseDate(String(row['记录日期'] || row['recordDate'] || row['record_date'] || '')),
        remarks: String(row['备注'] || row['remarks'] || '')
      };

      const { valid, errors, warnings } = validateRecord(rawRecord, index);
      allErrors.push(...errors);
      allWarnings.push(...warnings);

      if (valid) {
        records.push(rawRecord as DefectRecord);
      }
    });

    return {
      success: allErrors.length === 0 && records.length > 0,
      records,
      errors: allErrors,
      warnings: allWarnings
    };
  } catch (error) {
    return {
      success: false,
      records: [],
      errors: [`Excel 解析错误: ${(error as Error).message}`],
      warnings: []
    };
  }
}

export async function importFile(file: File): Promise<ImportResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else {
    return {
      success: false,
      records: [],
      errors: [`不支持的文件格式: .${extension}。请上传 CSV 或 Excel 文件。`],
      warnings: []
    };
  }
}

export function generateSampleCSV(): string {
  const headers = ['批次号', '缺陷类型', '类别', '数量', '材料来源', '生产线', '班次', '记录日期', '备注'];
  const sampleData = [
    ['BATCH001', '表面划痕', '外观缺陷', '5', '供应商A', 'L1', '早班', '2024-01-15', ''],
    ['BATCH001', '尺寸偏差', '尺寸缺陷', '3', '供应商A', 'L1', '早班', '2024-01-15', ''],
    ['BATCH001', '功能故障', '性能缺陷', '2', '供应商A', 'L1', '早班', '2024-01-15', '需复检'],
    ['BATCH002', '表面划痕', '外观缺陷', '8', '供应商B', 'L2', '中班', '2024-01-16', ''],
    ['BATCH002', '尺寸偏差', '尺寸缺陷', '1', '供应商B', 'L2', '中班', '2024-01-16', ''],
    ['BATCH002', '功能故障', '性能缺陷', '4', '供应商B', 'L2', '中班', '2024-01-16', '']
  ];

  return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
}
