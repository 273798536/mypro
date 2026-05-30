import Papa from 'papaparse';
import type { DataCleanResult, LuggageRecord, BadRow, FieldMapping } from '@/types';

const REQUIRED_FIELDS = ['timestamp', 'chuteId', 'position', 'height', 'speed'];

export const isEmptyRow = (row: Record<string, unknown> | string[]): boolean => {
  if (Array.isArray(row)) {
    return row.every((cell) => !cell || String(cell).trim() === '');
  }
  return Object.values(row).every(
    (val) => val === undefined || val === null || String(val).trim() === ''
  );
};

export const isRemarkRow = (row: Record<string, unknown> | string[]): boolean => {
  if (Array.isArray(row)) {
    const firstCell = row[0];
    return typeof firstCell === 'string' && firstCell.trim().startsWith('#');
  }
  const firstKey = Object.keys(row)[0];
  const firstValue = row[firstKey];
  return typeof firstValue === 'string' && firstValue.trim().startsWith('#');
};

export const hasMissingColumns = (
  row: Record<string, unknown>,
  mapping: FieldMapping
): boolean => {
  return REQUIRED_FIELDS.some((field) => {
    const columnName = mapping[field as keyof FieldMapping];
    if (!columnName) return field !== 'sortingPortId';
    const value = row[columnName];
    return value === undefined || value === null || String(value).trim() === '';
  });
};

export const hasInvalidValues = (
  row: Record<string, unknown>,
  mapping: FieldMapping
): { valid: boolean; description?: string } => {
  const position = Number(row[mapping.position]);
  const height = Number(row[mapping.height]);
  const speed = Number(row[mapping.speed]);

  if (isNaN(position) || position < 0) {
    return { valid: false, description: `position字段值"${row[mapping.position]}"不是有效数字` };
  }
  if (isNaN(height) || height < 0) {
    return { valid: false, description: `height字段值"${row[mapping.height]}"不是有效数字` };
  }
  if (isNaN(speed) || speed < 0) {
    return { valid: false, description: `speed字段值"${row[mapping.speed]}"不是有效数字` };
  }

  return { valid: true };
};

export const autoDetectFieldMapping = (headers: string[]): FieldMapping => {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const mapping: FieldMapping = {
    timestamp: '',
    chuteId: '',
    position: '',
    height: '',
    speed: '',
  };

  lowerHeaders.forEach((header, index) => {
    const originalHeader = headers[index];
    if (header.includes('time') || header.includes('日期') || header.includes('时间')) {
      mapping.timestamp = originalHeader;
    } else if (header.includes('chute') || header.includes('滑槽')) {
      mapping.chuteId = originalHeader;
    } else if (header.includes('pos') || header.includes('位置')) {
      mapping.position = originalHeader;
    } else if (header.includes('height') || header.includes('高度')) {
      mapping.height = originalHeader;
    } else if (header.includes('speed') || header.includes('速度')) {
      mapping.speed = originalHeader;
    } else if (header.includes('port') || header.includes('分拣口')) {
      mapping.sortingPortId = originalHeader;
    }
  });

  return mapping;
};

export const parseTimestamp = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) return parsed;
    const num = Number(value);
    if (!isNaN(num)) return num;
  }
  return Date.now();
};

export const parseCSV = async (
  file: File | string,
  mapping?: FieldMapping
): Promise<DataCleanResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: false,
      complete: (results) => {
        const badRows: BadRow[] = [];
        const validRows: LuggageRecord[] = [];
        const rows = results.data as Record<string, unknown>[];
        const headers = results.meta.fields || [];

        const fieldMapping = mapping || autoDetectFieldMapping(headers);

        rows.forEach((row, index) => {
          const rowIndex = index + 2;

          if (isEmptyRow(row)) {
            badRows.push({
              rowIndex,
              rawData: '',
              type: 'empty',
              description: '空行，无任何数据',
            });
            return;
          }

          if (isRemarkRow(row)) {
            const rawData = Object.values(row).join(',');
            badRows.push({
              rowIndex,
              rawData,
              type: 'remark',
              description: '备注行，以#开头',
            });
            return;
          }

          if (hasMissingColumns(row, fieldMapping)) {
            const rawData = Object.values(row).join(',');
            const missingFields = REQUIRED_FIELDS.filter(
              (f) => !row[fieldMapping[f as keyof FieldMapping] as string]
            ).join('、');
            badRows.push({
              rowIndex,
              rawData,
              type: 'missing_column',
              description: `缺少字段: ${missingFields}`,
            });
            return;
          }

          const valueCheck = hasInvalidValues(row, fieldMapping);
          if (!valueCheck.valid) {
            const rawData = Object.values(row).join(',');
            badRows.push({
              rowIndex,
              rawData,
              type: 'invalid_value',
              description: valueCheck.description || '数值无效',
            });
            return;
          }

          validRows.push({
            id: `lug-${String(validRows.length + 1).padStart(4, '0')}`,
            timestamp: parseTimestamp(row[fieldMapping.timestamp]),
            chuteId: String(row[fieldMapping.chuteId]),
            position: Number(row[fieldMapping.position]),
            height: Number(row[fieldMapping.height]),
            speed: Number(row[fieldMapping.speed]),
            sortingPortId: fieldMapping.sortingPortId
              ? String(row[fieldMapping.sortingPortId] || '')
              : undefined,
            status: 'normal',
          });
        });

        resolve({
          validRows,
          badRows,
          totalRows: rows.length,
          validCount: validRows.length,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const exportBadRowsCSV = (badRows: BadRow[]): void => {
  const headers = '行号,类型,原始数据,描述';
  const rows = badRows.map(
    (row) =>
      `${row.rowIndex},${row.type},"${row.rawData.replace(/"/g, '""')}",${row.description}`
  );
  const csv = [headers, ...rows].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `坏行记录_${Date.now()}.csv`;
  link.click();
};
