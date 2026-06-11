import Papa from 'papaparse';
import { CadRecord, FieldMapping } from '../types';
import { synonymMap } from '../data/fieldMappings';

const findStandardField = (cadFieldName: string, mappings: FieldMapping[]): string | null => {
  const exactMatch = mappings.find(m => m.cadField === cadFieldName);
  if (exactMatch) return exactMatch.standardField;
  
  const lowerName = cadFieldName.toLowerCase().trim();
  for (const [standardField, synonyms] of Object.entries(synonymMap)) {
    if (synonyms.some(s => s.toLowerCase() === lowerName)) {
      return standardField;
    }
  }
  
  return null;
};

export const parseCsvToRecords = (
  csvContent: string,
  fieldMappings: FieldMapping[]
): { records: CadRecord[]; warnings: string[] } => {
  const warnings: string[] = [];
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  if (result.errors.length > 0) {
    warnings.push(...result.errors.map(e => `CSV解析错误: ${e.message}`));
  }
  
  const headers = result.meta.fields || [];
  
  const fieldMap: Record<string, string> = {};
  headers.forEach(header => {
    const standardField = findStandardField(header, fieldMappings);
    if (standardField) {
      fieldMap[header] = standardField;
    }
  });
  
  const requiredFields = ['source', 'processStatus'];
  const missingRequired = requiredFields.filter(f => !Object.values(fieldMap).includes(f));
  if (missingRequired.length > 0) {
    warnings.push(`警告: 缺少强制字段映射: ${missingRequired.join(', ')}`);
  }
  
  const records: CadRecord[] = result.data.map((row, index) => {
    const originalFields: Record<string, unknown> = { ...row };
    
    const getValue = (standardField: string): string => {
      const header = Object.keys(fieldMap).find(h => fieldMap[h] === standardField);
      return header ? (row[header] || '') : '';
    };
    
    const x = parseFloat(getValue('x'));
    const y = parseFloat(getValue('y'));
    
    let processStatus: CadRecord['processStatus'] = 'pending';
    const statusValue = getValue('processStatus').toLowerCase();
    if (['completed', 'processing', 'pending', 'error'].includes(statusValue)) {
      processStatus = statusValue as CadRecord['processStatus'];
    }
    
    return {
      id: `REC-${String(index + 1).padStart(4, '0')}`,
      source: getValue('source') || '未知来源',
      processStatus,
      x: isNaN(x) ? index * 50 : x,
      y: isNaN(y) ? NaN : y,
      timestamp: getValue('timestamp') || '',
      layer: getValue('layer') || '默认图层',
      rowNumber: index + 1,
      originalFields,
    };
  });
  
  return { records, warnings };
};

export const recordsToCsv = (records: CadRecord[]): string => {
  const headers = ['行号', '来源', '处理状态', 'X坐标', 'Y坐标', '时间戳', '图层', '原始字段'];
  
  const rows = records.map(record => [
    record.rowNumber,
    record.source,
    record.processStatus,
    record.x,
    isNaN(record.y) ? '' : record.y,
    record.timestamp,
    record.layer,
    JSON.stringify(record.originalFields),
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const downloadCsv = (content: string, filename: string): void => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
