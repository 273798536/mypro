import * as XLSX from 'xlsx';
import type { Material, ImportStrategy } from '../types';

export interface ImportResult {
  success: boolean;
  materials: Material[];
  errors: string[];
  warnings: string[];
}

export const parseJSONFile = async (file: File): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    materials: [],
    errors: [],
    warnings: [],
  };

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const validation = validateMaterial(item, index);
        if (validation.valid) {
          result.materials.push(validation.material!);
        } else {
          result.errors.push(...validation.errors);
        }
      });
    } else if (data.materials && Array.isArray(data.materials)) {
      data.materials.forEach((item: unknown, index: number) => {
        const validation = validateMaterial(item, index);
        if (validation.valid) {
          result.materials.push(validation.material!);
        } else {
          result.errors.push(...validation.errors);
        }
      });
    } else {
      result.errors.push('JSON格式不正确，请确保包含materials数组');
      result.success = false;
    }
  } catch (e) {
    result.success = false;
    result.errors.push(`JSON解析失败: ${(e as Error).message}`);
  }

  return result;
};

export const parseExcelFile = async (file: File): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    materials: [],
    errors: [],
    warnings: [],
  };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    jsonData.forEach((row: unknown, index) => {
      const material = parseExcelRow(row as Record<string, unknown>, index);
      if (material) {
        result.materials.push(material);
      } else {
        result.warnings.push(`第${index + 2}行数据格式不正确，已跳过`);
      }
    });
  } catch (e) {
    result.success = false;
    result.errors.push(`Excel解析失败: ${(e as Error).message}`);
  }

  return result;
};

export const parseCSVFile = async (file: File): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    materials: [],
    errors: [],
    warnings: [],
  };

  try {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const material = parseCSVRow(row, i);
      if (material) {
        result.materials.push(material);
      } else {
        result.warnings.push(`第${i + 1}行数据格式不正确，已跳过`);
      }
    }
  } catch (e) {
    result.success = false;
    result.errors.push(`CSV解析失败: ${(e as Error).message}`);
  }

  return result;
};

const validateMaterial = (item: unknown, index: number): { valid: boolean; material?: Material; errors: string[] } => {
  const errors: string[] = [];
  const obj = item as Record<string, unknown>;

  if (!obj.id) {
    errors.push(`第${index + 1}条数据缺少id字段`);
  }
  if (!obj.type || !['container', 'license_plate', 'booking_note', 'dangerous_mark'].includes(obj.type as string)) {
    errors.push(`第${index + 1}条数据type字段无效`);
  }
  if (!obj.source) {
    errors.push(`第${index + 1}条数据缺少source字段`);
  }
  if (!obj.data) {
    errors.push(`第${index + 1}条数据缺少data字段`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    material: {
      id: obj.id as string,
      type: obj.type as Material['type'],
      source: obj.source as string,
      imageUrl: obj.imageUrl as string | undefined,
      data: obj.data as Material['data'],
      importTime: Date.now(),
      importBatch: '',
    },
    errors: [],
  };
};

const parseExcelRow = (row: Record<string, unknown>, index: number): Material | null => {
  try {
    const type = (row['类型'] || row['type'] || '') as string;
    const id = (row['ID'] || row['id'] || `import_${Date.now()}_${index}`) as string;
    const source = (row['来源'] || row['source'] || '导入数据') as string;

    let data: Record<string, unknown> = {};

    switch (type.toLowerCase()) {
      case 'container':
      case '集装箱':
        data = {
          containerNumber: (row['箱号'] || row['containerNumber'] || '') as string,
          size: (row['尺寸'] || row['size'] || '40ft') as string,
          type: (row['箱型'] || row['type_detail'] || 'GP') as string,
        };
        break;
      case 'license_plate':
      case '车牌':
        data = {
          plateNumber: (row['车牌号'] || row['plateNumber'] || '') as string,
          vehicleType: (row['车型'] || row['vehicleType'] || '集卡') as string,
        };
        break;
      case 'booking_note':
      case '预约单':
        data = {
          bookingNumber: (row['预约号'] || row['bookingNumber'] || '') as string,
          containerNumber: (row['预约箱号'] || row['containerNumber'] || '') as string,
          plateNumber: (row['预约车牌'] || row['plateNumber'] || '') as string,
          cargoType: (row['货物类型'] || row['cargoType'] || '') as string,
          isDangerous: Boolean(row['是否危品'] || row['isDangerous']),
          dangerousClass: (row['危品等级'] || row['dangerousClass']) as string | undefined,
          valid: Boolean(row['是否有效'] ?? row['valid'] ?? true),
        };
        break;
      case 'dangerous_mark':
      case '危品标记':
        data = {
          classNumber: (row['危品等级'] || row['classNumber'] || '') as string,
          className: (row['危品名称'] || row['className'] || '') as string,
          hasMark: Boolean(row['有标记'] || row['hasMark']),
        };
        break;
      default:
        return null;
    }

    return {
      id,
      type: mapType(type),
      source,
      data: data as unknown as Material['data'],
      importTime: Date.now(),
      importBatch: '',
    };
  } catch {
    return null;
  }
};

const parseCSVRow = (row: Record<string, string>, index: number): Material | null => {
  return parseExcelRow(row, index);
};

const mapType = (type: string): Material['type'] => {
  const t = type.toLowerCase();
  if (t.includes('container') || t.includes('集装')) return 'container';
  if (t.includes('license') || t.includes('车牌') || t.includes('plate')) return 'license_plate';
  if (t.includes('booking') || t.includes('预约')) return 'booking_note';
  if (t.includes('danger') || t.includes('危品')) return 'dangerous_mark';
  return 'container';
};

export const getImportStrategyDescription = (strategy: ImportStrategy): string => {
  switch (strategy) {
    case 'ignore':
      return '忽略：保留已有数据，跳过重复数据';
    case 'overwrite':
      return '覆盖：删除重复的旧数据，导入新数据';
    case 'append':
      return '追加：保留所有数据，重复数据生成新ID导入';
  }
};
