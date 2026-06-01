import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  DataSourceType,
  DataSource,
  Room,
  Band,
  Course,
  ImportResult,
  FieldMapping,
} from '../types';
import { generateId, dayjsInstance } from '../utils/dateUtils';

export const roomFieldMappings: FieldMapping[] = [
  { sourceField: 'name', targetField: 'name', required: true },
  { sourceField: '房间名称', targetField: 'name', required: true },
  { sourceField: 'capacity', targetField: 'capacity', required: true },
  { sourceField: '容量', targetField: 'capacity', required: true },
  { sourceField: 'equipment', targetField: 'equipment', required: false },
  { sourceField: '设备', targetField: 'equipment', required: false },
];

export const bandFieldMappings: FieldMapping[] = [
  { sourceField: 'name', targetField: 'name', required: true },
  { sourceField: '乐队名称', targetField: 'name', required: true },
  { sourceField: 'members', targetField: 'members', required: false },
  { sourceField: '成员', targetField: 'members', required: false },
  { sourceField: 'requiredEquipment', targetField: 'requiredEquipment', required: true },
  { sourceField: '所需设备', targetField: 'requiredEquipment', required: true },
];

export const courseFieldMappings: FieldMapping[] = [
  { sourceField: 'name', targetField: 'name', required: true },
  { sourceField: '课程名称', targetField: 'name', required: true },
  { sourceField: 'teacher', targetField: 'teacher', required: true },
  { sourceField: '老师', targetField: 'teacher', required: true },
  { sourceField: 'startTime', targetField: 'startTime', required: true },
  { sourceField: '开始时间', targetField: 'startTime', required: true },
  { sourceField: 'endTime', targetField: 'endTime', required: true },
  { sourceField: '结束时间', targetField: 'endTime', required: true },
  { sourceField: 'dayOfWeek', targetField: 'dayOfWeek', required: false },
  { sourceField: '星期', targetField: 'dayOfWeek', required: false },
];

export function getFieldMappings(type: DataSourceType): FieldMapping[] {
  switch (type) {
    case 'room':
      return roomFieldMappings;
    case 'band':
      return bandFieldMappings;
    case 'course':
      return courseFieldMappings;
  }
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(/[,，;；、]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function parseNumberField(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function mapFields<T extends Record<string, unknown>>(
  row: Record<string, unknown>,
  mappings: FieldMapping[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  
  for (const mapping of mappings) {
    if (row[mapping.sourceField] !== undefined) {
      const value = row[mapping.sourceField];
      
      if (mapping.targetField === 'equipment' || mapping.targetField === 'requiredEquipment' || mapping.targetField === 'members') {
        result[mapping.targetField] = parseArrayField(value);
      } else if (mapping.targetField === 'capacity' || mapping.targetField === 'dayOfWeek') {
        result[mapping.targetField] = parseNumberField(value);
      } else {
        result[mapping.targetField] = value;
      }
    }
  }
  
  return result as Partial<T>;
}

function validateRequiredFields(
  data: Record<string, unknown>,
  mappings: FieldMapping[],
  rowIndex: number,
): string[] {
  const errors: string[] = [];
  const requiredFields = mappings.filter(m => m.required);
  
  for (const field of requiredFields) {
    const hasField = mappings.some(
      m => m.targetField === field.targetField && data[m.targetField] !== undefined && data[m.targetField] !== ''
    );
    if (!hasField) {
      errors.push(`第 ${rowIndex + 1} 行缺少必填字段: ${field.targetField}`);
    }
  }
  
  return errors;
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
}

async function parseCsvFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as Record<string, unknown>[]);
      },
      error: reject,
    });
  });
}

export async function parseFile(
  file: File,
): Promise<Record<string, unknown>[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else if (extension === 'csv') {
    return parseCsvFile(file);
  }
  
  throw new Error(`不支持的文件格式: ${extension}`);
}

export async function importData<T extends Room | Band | Course>(
  type: DataSourceType,
  file: File,
  source: string,
  version: string,
): Promise<ImportResult<T>> {
  const errors: string[] = [];
  const mappings = getFieldMappings(type);
  const sourceId = generateId();
  
  try {
    const rawData = await parseFile(file);
    const parsedData: T[] = [];
    
    rawData.forEach((row, index) => {
      const mapped = mapFields<Record<string, unknown>>(row, mappings);
      const rowErrors = validateRequiredFields(mapped, mappings, index);
      
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        parsedData.push({
          ...mapped,
          id: generateId(),
          sourceId,
          version,
        } as T);
      }
    });
    
    const dataSource: DataSource = {
      id: sourceId,
      type,
      name: file.name,
      source,
      version,
      importedAt: dayjsInstance().toISOString(),
      snapshot: rawData,
      recordCount: parsedData.length,
    };
    
    return {
      success: errors.length === 0,
      data: parsedData,
      errors,
      sourceId,
    };
  } catch (e) {
    return {
      success: false,
      data: [],
      errors: [`解析文件失败: ${e instanceof Error ? e.message : String(e)}`],
      sourceId: '',
    };
  }
}

export function createDataSource(
  type: DataSourceType,
  name: string,
  source: string,
  version: string,
  snapshot: unknown,
  recordCount: number,
): DataSource {
  return {
    id: generateId(),
    type,
    name,
    source,
    version,
    importedAt: dayjsInstance().toISOString(),
    snapshot,
    recordCount,
  };
}

export function detectFileType(file: File): 'excel' | 'csv' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'csv') return 'csv';
  return 'unknown';
}

export function generateTemplateData(type: DataSourceType): Record<string, unknown>[] {
  switch (type) {
    case 'room':
      return [{
        '房间名称': '排练室A',
        '容量': 10,
        '设备': '架子鼓,电钢琴,吉他音箱',
      }];
    case 'band':
      return [{
        '乐队名称': '极光乐队',
        '成员': '张明(主唱),李华(贝斯)',
        '所需设备': '架子鼓,电钢琴',
      }];
    case 'course':
      return [{
        '课程名称': '电声乐队排练课',
        '老师': '周老师',
        '开始时间': '09:00',
        '结束时间': '11:00',
        '星期': 1,
      }];
  }
}

export function downloadTemplate(type: DataSourceType): void {
  const templateData = generateTemplateData(type);
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  const fileName = {
    room: '排练室表模板.xlsx',
    band: '乐队名单模板.xlsx',
    course: '课程安排模板.xlsx',
  }[type];
  
  XLSX.writeFile(workbook, fileName);
}
