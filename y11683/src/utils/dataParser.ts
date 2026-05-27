import Papa from 'papaparse';
import type { FuturesData, ParsedRow, DetectionResult } from '../types';

const REQUIRED_FIELDS = ['contractMonth', 'price', 'timeWindow'] as const;

const FIELD_ALIASES: Record<string, string[]> = {
  contractMonth: ['合约月份', '交割月', 'contractMonth', 'contract_month', 'month'],
  price: ['价格', '收盘价', 'price', 'close', 'settle'],
  volume: ['成交量', 'volume', 'vol', 'openInterest'],
  basis: ['基差', 'basis', 'spread'],
  timeWindow: ['时间窗口', '日期', '观察日', 'timeWindow', 'date', 'observationDate'],
  notes: ['研究备注', '备注', 'notes', 'remark', 'comment'],
  source: ['来源', '数据来源', 'source', 'origin'],
};

export function detectFieldMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const trimmed = header.trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((alias) => trimmed.toLowerCase().includes(alias.toLowerCase()))) {
        if (!mapping[field]) {
          mapping[field] = trimmed;
          break;
        }
      }
    }
  }
  return mapping;
}

function parseNumber(value: string): number | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  const cleaned = value.replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseMonth(value: string): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  const match = cleaned.match(/(\d{4})[-\/]?(\d{1,2})/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    return `${year}-${month}`;
  }
  const cnMatch = cleaned.match(/(\d{4})年(\d{1,2})月/);
  if (cnMatch) {
    return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}`;
  }
  return null;
}

function parseDate(value: string): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  const match = cleaned.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  const cnMatch = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cnMatch) {
    return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
  }
  return null;
}

export function parseCSVFile(
  file: File,
  fieldMapping: Record<string, string>
): Promise<{ rows: ParsedRow[]; detections: DetectionResult[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRow[] = [];
        const detections: DetectionResult[] = [];
        const data = results.data as Record<string, string>[];

        data.forEach((row, index) => {
          const originalRow = index + 2;
          const contractMonth = parseMonth(row[fieldMapping.contractMonth] || '');
          const price = parseNumber(row[fieldMapping.price] || '');
          const timeWindow = parseDate(row[fieldMapping.timeWindow] || '');

          if (!contractMonth || !price || !timeWindow) {
            const missing: string[] = [];
            if (!contractMonth) missing.push('合约月份');
            if (!price) missing.push('价格');
            if (!timeWindow) missing.push('时间窗口');

            rows.push({
              originalRow,
              data: null,
              error: `缺少必填字段: ${missing.join(', ')}`,
            });

            detections.push({
              id: `det-${originalRow}-parse`,
              type: 'parse_error',
              severity: 'error',
              description: `第${originalRow}行: 缺少必填字段 ${missing.join(', ')}`,
              originalRow,
              relatedDataIds: [],
              resolved: false,
            });
            return;
          }

          const volume = parseNumber(row[fieldMapping.volume] || '');
          const basis = parseNumber(row[fieldMapping.basis] || '');

          const futuresData: FuturesData = {
            id: `data-${originalRow}`,
            contractMonth,
            price,
            volume: volume ?? 0,
            basis: basis ?? 0,
            timeWindow,
            notes: row[fieldMapping.notes] || '',
            source: row[fieldMapping.source] || file.name,
            originalRow,
            status: 'normal',
          };

          if (volume === null || basis === null) {
            futuresData.status = 'warning';
            const missingOpt: string[] = [];
            if (volume === null) missingOpt.push('成交量');
            if (basis === null) missingOpt.push('基差');
            detections.push({
              id: `det-${originalRow}-warn`,
              type: 'parse_error',
              severity: 'warning',
              description: `第${originalRow}行: ${missingOpt.join(', ')}字段缺失，已使用默认值`,
              originalRow,
              relatedDataIds: [futuresData.id],
              resolved: false,
            });
          }

          rows.push({
            originalRow,
            data: futuresData,
            error: null,
          });
        });

        resolve({ rows, detections });
      },
      error: (error) => reject(error),
    });
  });
}

export function generateId(): string {
  return `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}