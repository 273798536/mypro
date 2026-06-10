import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Sample, PathologyNote, SampleStatus, QualityLevel } from '../types';

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

export const parseCSV = <T>(file: File): Promise<ImportResult<T>> => {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: T[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: unknown, index) => {
          if (row && typeof row === 'object') {
            data.push(row as T);
          } else {
            warnings.push(`第 ${index + 1} 行数据格式不正确，已跳过`);
          }
        });

        if (results.errors.length > 0) {
          results.errors.forEach(err => {
            if (err.type === 'FieldMismatch') {
              warnings.push(`第 ${err.row + 1} 行：${err.message}`);
            } else {
              errors.push(`第 ${err.row + 1} 行：${err.message}`);
            }
          });
        }

        resolve({
          success: errors.length === 0,
          data,
          errors,
          warnings,
        });
      },
      error: (err) => {
        resolve({
          success: false,
          data: [],
          errors: [`CSV解析失败：${err.message}`],
          warnings: [],
        });
      },
    });
  });
};

export const parseExcel = <T>(file: File): Promise<ImportResult<T>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<T>(worksheet);

        resolve({
          success: true,
          data: jsonData,
          errors: [],
          warnings: [],
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['Excel文件读取失败'],
        warnings: [],
      });
    };

    reader.readAsBinaryString(file);
  });
};

export const parseSampleFile = async (file: File): Promise<ImportResult<Omit<Sample, 'id' | 'createdAt' | 'updatedAt'>>> => {
  let result: ImportResult<Record<string, unknown>>;

  if (file.name.endsWith('.csv')) {
    result = await parseCSV<Record<string, unknown>>(file);
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    result = await parseExcel<Record<string, unknown>>(file);
  } else {
    return {
      success: false,
      data: [],
      errors: ['不支持的文件格式，请上传CSV或Excel文件'],
      warnings: [],
    };
  }

  if (!result.success) {
    return { ...result, data: [] };
  }

  const samples: Omit<Sample, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: string[] = [];

  result.data.forEach((row, index) => {
    try {
      const barcode = String(row['条码'] || row['barcode'] || '');
      const name = String(row['名称'] || row['name'] || '');

      if (!barcode) {
        errors.push(`第 ${index + 1} 行：缺少条码信息`);
        return;
      }

      samples.push({
        barcode,
        name,
        material: String(row['材料'] || row['material'] || '未知材料'),
        collector: String(row['采集人'] || row['collector'] || '未知'),
        collectionTime: row['采集时间'] || row['collectionTime']
          ? new Date(String(row['采集时间'] || row['collectionTime']))
          : new Date(),
        status: (row['状态'] as SampleStatus) || SampleStatus.AVAILABLE,
        qualityLevel: (row['质量等级'] as QualityLevel) || QualityLevel.B,
        groupId: row['分组ID'] || row['groupId'] ? String(row['分组ID'] || row['groupId']) : undefined,
        createdBy: '批量导入',
        updatedBy: '批量导入',
      });
    } catch (err) {
      errors.push(`第 ${index + 1} 行：数据解析失败 - ${err instanceof Error ? err.message : '未知错误'}`);
    }
  });

  return {
    success: errors.length === 0,
    data: samples,
    errors,
    warnings: result.warnings,
  };
};

export const parsePathologyNoteFile = async (file: File): Promise<ImportResult<Omit<PathologyNote, 'id'>>> => {
  let result: ImportResult<Record<string, unknown>>;

  if (file.name.endsWith('.csv')) {
    result = await parseCSV<Record<string, unknown>>(file);
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    result = await parseExcel<Record<string, unknown>>(file);
  } else {
    return {
      success: false,
      data: [],
      errors: ['不支持的文件格式，请上传CSV或Excel文件'],
      warnings: [],
    };
  }

  if (!result.success) {
    return { ...result, data: [] };
  }

  const notes: Omit<PathologyNote, 'id'>[] = [];
  const errors: string[] = [];

  result.data.forEach((row, index) => {
    try {
      const barcode = String(row['条码'] || row['barcode'] || '');
      const content = String(row['备注'] || row['content'] || '');

      if (!barcode) {
        errors.push(`第 ${index + 1} 行：缺少条码信息`);
        return;
      }

      if (!content) {
        errors.push(`第 ${index + 1} 行：缺少备注内容`);
        return;
      }

      notes.push({
        barcode,
        sampleId: '',
        content,
        pathologist: String(row['病理医师'] || row['pathologist'] || '未知'),
        noteTime: row['备注时间'] || row['noteTime']
          ? new Date(String(row['备注时间'] || row['noteTime']))
          : new Date(),
        isConflict: false,
      });
    } catch (err) {
      errors.push(`第 ${index + 1} 行：数据解析失败 - ${err instanceof Error ? err.message : '未知错误'}`);
    }
  });

  return {
    success: errors.length === 0,
    data: notes,
    errors,
    warnings: result.warnings,
  };
};

export const exportToCSV = <T>(data: T[], filename: string): void => {
  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

export const exportToExcel = <T>(data: T[], filename: string, sheetName = 'Sheet1'): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
