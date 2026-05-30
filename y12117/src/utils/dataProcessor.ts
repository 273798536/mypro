import Papa from 'papaparse';
import { DataRow, UploadedFile, FieldInfo, FieldType, AnalysisParams } from '@/types';

export function parseCSV(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows: DataRow[] = results.data.map((row: any, index: number) => ({
          ...row,
          __sourceFile: file.name,
          __rowIndex: index + 1,
          __sourceFiles: []
        }));
        
        const fields = detectFields(rows);
        
        resolve({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          rows,
          fields
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function detectFields(rows: DataRow[]): FieldInfo[] {
  if (rows.length === 0) return [];
  
  const firstRow = rows[0];
  const fieldNames = Object.keys(firstRow).filter(k => !k.startsWith('__'));
  
  return fieldNames.map(name => {
    const sampleValues: (string | number)[] = [];
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const val = rows[i][name];
      if (val !== null && val !== undefined) {
        sampleValues.push(val as string | number);
      }
    }
    
    const type = detectFieldType(name, sampleValues);
    
    return {
      name,
      type,
      sampleValues
    };
  });
}

export function detectFieldType(name: string, values: (string | number)[]): FieldType {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('date') || lowerName.includes('time') || 
      lowerName.includes('日期') || lowerName.includes('时间') ||
      lowerName.includes('month') || lowerName.includes('year') ||
      lowerName.includes('quarter') || lowerName.includes('week')) {
    return 'time';
  }
  
  if (lowerName.includes('group') || lowerName.includes('category') ||
      lowerName.includes('分组') || lowerName.includes('类别') ||
      lowerName.includes('region') || lowerName.includes('部门') ||
      lowerName.includes('type') || lowerName.includes('类型')) {
    return 'group';
  }
  
  const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)));
  if (numericValues.length >= values.length * 0.7) {
    return 'metric';
  }
  
  return 'unknown';
}

export function parseDate(value: string | number | Date | null): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  
  if (typeof value === 'number') {
    return new Date(value);
  }
  
  const str = String(value);
  
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str);
  }
  
  if (/^\d{4}\/\d{2}\/\d{2}/.test(str)) {
    return new Date(str.replace(/\//g, '-'));
  }
  
  if (/^\d{4}年\d{1,2}月/.test(str)) {
    const match = str.match(/(\d{4})年(\d{1,2})月/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1);
    }
  }
  
  if (/^\d{4}-\d{2}/.test(str)) {
    return new Date(str + '-01');
  }
  
  if (/^\d{4}$/.test(str)) {
    return new Date(parseInt(str), 0, 1);
  }
  
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

export function alignData(
  files: UploadedFile[],
  params: AnalysisParams
): DataRow[] {
  if (files.length === 0 || params.metricFields.length === 0) {
    return [];
  }
  
  const allFields = new Set<string>();
  for (const file of files) {
    for (const field of file.fields) {
      allFields.add(field.name);
    }
  }
  
  if (params.timeField) {
    const timeMap = new Map<number, DataRow>();
    
    for (const file of files) {
      for (const row of file.rows) {
        const timeValue = row[params.timeField];
        let parsedDate: Date | null = null;
        if (typeof timeValue === 'string' || typeof timeValue === 'number' || timeValue instanceof Date) {
          parsedDate = parseDate(timeValue);
        }
        
        if (!parsedDate) continue;
        
        if (params.timeRange.start && parsedDate < params.timeRange.start) continue;
        if (params.timeRange.end && parsedDate > params.timeRange.end) continue;
        
        const timeKey = parsedDate.getTime();
        
        if (!timeMap.has(timeKey)) {
          const newRow: DataRow = {
            [params.timeField]: parsedDate,
            __sourceFile: file.name,
            __rowIndex: row.__rowIndex,
            __sourceFiles: []
          };
          for (const field of allFields) {
            if (field !== params.timeField) {
              newRow[field] = null;
            }
          }
          timeMap.set(timeKey, newRow);
        }
        
        const alignedRow = timeMap.get(timeKey)!;
        
        const rowFields: string[] = [];
        for (const field of file.fields) {
          if (field.name === params.timeField) continue;
          if (row[field.name] !== undefined && row[field.name] !== null) {
            alignedRow[field.name] = row[field.name];
            rowFields.push(field.name);
          }
        }
        
        alignedRow.__sourceFiles.push({
          file: file.name,
          rowIndex: row.__rowIndex,
          fields: rowFields
        });
      }
    }
    
    const result = Array.from(timeMap.values());
    result.sort((a, b) => {
      const dateA = a[params.timeField];
      const dateB = b[params.timeField];
      if (dateA instanceof Date && dateB instanceof Date) {
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });
    
    return result;
  } else {
    const allRows: DataRow[] = [];
    
    for (const file of files) {
      for (const row of file.rows) {
        const alignedRow: DataRow = {
          ...row,
          __sourceFile: file.name,
          __rowIndex: row.__rowIndex,
          __sourceFiles: [{
            file: file.name,
            rowIndex: row.__rowIndex,
            fields: file.fields.map(f => f.name)
          }]
        };
        allRows.push(alignedRow);
      }
    }
    
    return allRows;
  }
}

export function formatNumber(value: number, decimals: number = 3): string {
  return value.toFixed(decimals);
}

export function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

export function getFieldValues(data: DataRow[], field: string): number[] {
  const values: number[] = [];
  for (const row of data) {
    const val = row[field];
    if (val !== null && val !== undefined && !isNaN(Number(val))) {
      values.push(Number(val));
    }
  }
  return values;
}
