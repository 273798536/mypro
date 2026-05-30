import Papa from 'papaparse';
import type { ImportResult, BadRow, DataSource, ErrorType } from '../engine/types';

export async function parseCSVFile(
  file: File,
  source: DataSource
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const text = file.text();
    
    text.then(content => {
      const result = parseCSVContent(content, source, file.name);
      resolve(result);
    }).catch(reject);
  });
}

export function parseCSVContent(
  content: string,
  source: DataSource,
  sourceName: string = 'unknown'
): ImportResult {
  const lines = content.split(/\r?\n/);
  const validRows: any[] = [];
  const badRows: BadRow[] = [];
  
  let headerLine: string | null = null;
  let headerColumns: string[] = [];
  let dataStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      badRows.push({
        rowIndex: i + 1,
        rawContent: lines[i],
        errorType: 'empty',
        source: sourceName,
        description: '空行',
      });
      continue;
    }
    
    if (line.startsWith('#')) {
      badRows.push({
        rowIndex: i + 1,
        rawContent: lines[i],
        errorType: 'comment',
        source: sourceName,
        description: '备注行',
      });
      continue;
    }
    
    if (!headerLine) {
      headerLine = line;
      headerColumns = line.split(',').map(c => c.trim());
      dataStartIndex = i + 1;
      
      const expectedColumns = source === 'fault_card' 
        ? ['id', 'x', 'y', 'fault_type', 'severity', 'source']
        : ['node_id', 'timestamp', 'power_voltage', 'power_current', 'consumption', 'source'];
      
      const missingColumns = expectedColumns.filter(c => !headerColumns.includes(c));
      if (missingColumns.length > 0) {
        badRows.push({
          rowIndex: i + 1,
          rawContent: lines[i],
          errorType: 'missing_columns',
          source: sourceName,
          description: `表头缺少列: ${missingColumns.join(', ')}`,
        });
      }
      continue;
    }
    
    const values = line.split(',').map(v => v.trim());
    
    if (values.length < headerColumns.length) {
      badRows.push({
        rowIndex: i + 1,
        rawContent: lines[i],
        errorType: 'missing_columns',
        source: sourceName,
        description: `数据列数不足: 期望${headerColumns.length}列, 实际${values.length}列`,
      });
      continue;
    }
    
    const rowData: any = {};
    let hasError = false;
    
    for (let j = 0; j < headerColumns.length; j++) {
      const column = headerColumns[j];
      const value = values[j];
      
      const validation = validateColumn(column, value, source);
      if (!validation.valid) {
        badRows.push({
          rowIndex: i + 1,
          rawContent: lines[i],
          errorType: 'invalid_data',
          source: sourceName,
          description: validation.error || `列 ${column} 数据无效`,
        });
        hasError = true;
        break;
      }
      
      rowData[column] = validation.parsedValue ?? value;
    }
    
    if (!hasError) {
      validRows.push(rowData);
    }
  }
  
  return {
    validRows,
    badRows,
    source,
  };
}

function validateColumn(
  column: string,
  value: string,
  source: DataSource
): { valid: boolean; error?: string; parsedValue?: any } {
  if (source === 'fault_card') {
    switch (column) {
      case 'id':
        if (!value) return { valid: false, error: 'ID不能为空' };
        return { valid: true };
      case 'x':
      case 'y': {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) return { valid: false, error: `${column}必须是非负整数` };
        return { valid: true, parsedValue: num };
      }
      case 'fault_type':
        if (!['wire_damage', 'connection_loss', 'overload', 'insulation_failure'].includes(value)) {
          return { valid: false, error: `故障类型无效: ${value}` };
        }
        return { valid: true };
      case 'severity':
        if (!['low', 'medium', 'high'].includes(value)) {
          return { valid: false, error: `严重程度无效: ${value}` };
        }
        return { valid: true };
      case 'source':
        return { valid: true };
      default:
        return { valid: true };
    }
  }
  
  if (source === 'power_meter') {
    switch (column) {
      case 'node_id':
        if (!value) return { valid: false, error: '节点ID不能为空' };
        return { valid: true };
      case 'timestamp': {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) return { valid: false, error: '时间戳必须是非负数字' };
        return { valid: true, parsedValue: num };
      }
      case 'power_voltage':
      case 'power_current':
      case 'consumption': {
        const num = parseFloat(value);
        if (isNaN(num)) return { valid: false, error: `${column}必须是数字` };
        return { valid: true, parsedValue: num };
      }
      case 'source':
        return { valid: true };
      default:
        return { valid: true };
    }
  }
  
  return { valid: true };
}

export function exportToCSV(data: any[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportToJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatBadRowsForDisplay(badRows: BadRow[]): {
  empty: BadRow[];
  comment: BadRow[];
  missingColumns: BadRow[];
  invalidData: BadRow[];
} {
  return {
    empty: badRows.filter(r => r.errorType === 'empty'),
    comment: badRows.filter(r => r.errorType === 'comment'),
    missingColumns: badRows.filter(r => r.errorType === 'missing_columns'),
    invalidData: badRows.filter(r => r.errorType === 'invalid_data'),
  };
}

export function getErrorTypeLabel(type: ErrorType): string {
  const labels: Record<ErrorType, string> = {
    empty: '空行',
    comment: '备注',
    missing_columns: '缺列',
    invalid_data: '数据无效',
  };
  return labels[type];
}

export function getErrorTypeColor(type: ErrorType): string {
  const colors: Record<ErrorType, string> = {
    empty: 'text-muted',
    comment: 'text-secondary',
    missing_columns: 'text-warning-amber',
    invalid_data: 'text-danger-red',
  };
  return colors[type];
}
