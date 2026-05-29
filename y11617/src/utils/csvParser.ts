import Papa from 'papaparse';
import type { CashflowEntry, CashflowType, FlowDirection, Priority } from '../types';

const TYPE_MAP: Record<string, CashflowType> = {
  '工资': 'salary',
  'salary': 'salary',
  '房租': 'rent',
  'rent': 'rent',
  '贷款': 'loan',
  'loan': 'loan',
  '回款': 'receivable',
  'receivable': 'receivable',
  '税费': 'tax',
  'tax': 'tax',
  '其他': 'other',
  'other': 'other'
};

const DIRECTION_MAP: Record<string, FlowDirection> = {
  '收入': 'in',
  'in': 'in',
  '流入': 'in',
  '支出': 'out',
  'out': 'out',
  '流出': 'out'
};

const PRIORITY_MAP: Record<string, Priority> = {
  '高': 'high',
  'high': 'high',
  '中': 'medium',
  'medium': 'medium',
  '低': 'low',
  'low': 'low'
};

function normalizeType(value: string): CashflowType {
  const key = value.trim().toLowerCase();
  return TYPE_MAP[key] || TYPE_MAP[value.trim()] || 'other';
}

function normalizeDirection(value: string, type: CashflowType): FlowDirection {
  if (value) {
    const key = value.trim().toLowerCase();
    if (DIRECTION_MAP[key]) return DIRECTION_MAP[key];
    if (DIRECTION_MAP[value.trim()]) return DIRECTION_MAP[value.trim()];
  }
  return type === 'receivable' ? 'in' : 'out';
}

function normalizePriority(value: string): Priority {
  if (!value) return 'medium';
  const key = value.trim().toLowerCase();
  return PRIORITY_MAP[key] || PRIORITY_MAP[value.trim()] || 'medium';
}

function normalizeDate(value: string): string {
  const cleaned = value.trim().replace(/[年月]/g, '-').replace(/[日号]/g, '');
  const parts = cleaned.split('-').map(p => p.trim());
  if (parts.length === 3) {
    const year = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return value;
}

function normalizeAmount(value: string | number): number {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[¥,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export interface ParseResult {
  entries: Omit<CashflowEntry, 'id' | 'createdAt' | 'updatedAt' | 'revisionHistory'>[];
  errors: string[];
}

export function parseCSV(content: string): ParseResult {
  const result = (Papa as any).parse(content, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true
  });

  const errors: string[] = [];
  const entries: ParseResult['entries'] = [];

  (result.data || []).forEach((row: any, index: number) => {
    try {
      const type = normalizeType(row.type || row['类型'] || row['类型'] || 'other');
      const direction = normalizeDirection(row.direction || row['方向'] || '', type);
      const amount = normalizeAmount(row.amount || row['金额'] || '0');
      const date = normalizeDate(row.date || row['日期'] || '');
      const description = row.description || row['描述'] || row['备注'] || '';
      const priority = normalizePriority(row.priority || row['优先级'] || '');
      const source = row.source || row['来源'] || '导入';
      const isDelayed = (row.isDelayed || row['延期'] || 'false').toString().toLowerCase() === 'true';
      const delayNote = row.delayNote || row['延期备注'] || undefined;
      const originalDate = row.originalDate || row['原定日期'] ? normalizeDate(row.originalDate || row['原定日期']) : undefined;

      if (!date || date === 'Invalid date') {
        errors.push(`第${index + 2}行：日期格式无效`);
        return;
      }

      if (amount <= 0) {
        errors.push(`第${index + 2}行：金额必须大于0`);
        return;
      }

      entries.push({
        type,
        direction,
        amount,
        date,
        description,
        priority,
        source,
        isDelayed,
        delayNote,
        originalDate
      });
    } catch (e: any) {
      errors.push(`第${index + 2}行：解析失败 - ${e.message}`);
    }
  });

  return { entries, errors };
}

export function parseJSON(content: string): ParseResult {
  try {
    const data = JSON.parse(content);
    const entries: ParseResult['entries'] = [];
    const errors: string[] = [];

    if (Array.isArray(data)) {
      data.forEach((item: any, index: number) => {
        try {
          entries.push({
            type: normalizeType(item.type || 'other'),
            direction: item.direction || (item.type === 'receivable' ? 'in' : 'out'),
            amount: normalizeAmount(item.amount || 0),
            date: normalizeDate(item.date || ''),
            description: item.description || '',
            priority: normalizePriority(item.priority || 'medium'),
            source: item.source || '导入',
            isDelayed: item.isDelayed || false,
            delayNote: item.delayNote,
            originalDate: item.originalDate
          });
        } catch (e: any) {
          errors.push(`第${index + 1}条：解析失败`);
        }
      });
    }

    return { entries, errors };
  } catch (e: any) {
    return { entries: [], errors: [`JSON解析失败：${e.message}`] };
  }
}

export function exportToCSV(entries: CashflowEntry[]): string {
  const rows = entries.map(e => ({
    类型: e.type,
    方向: e.direction,
    金额: e.amount,
    日期: e.date,
    描述: e.description,
    优先级: e.priority,
    来源: e.source,
    延期: e.isDelayed,
    延期备注: e.delayNote || '',
    原定日期: e.originalDate || ''
  }));

  return Papa.unparse(rows, {
    header: true,
    quotes: true
  });
}