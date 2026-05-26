import { CashFlowRecord, FilterState } from '../types';

export function filterRecords(records: CashFlowRecord[], filters: FilterState): CashFlowRecord[] {
  return records.filter(record => {
    if (filters.selectedCurrencies.length > 0 && !filters.selectedCurrencies.includes(record.currency)) {
      return false;
    }
    if (record.riskLevel < filters.riskRange[0] || record.riskLevel > filters.riskRange[1]) {
      return false;
    }
    if (record.flowDate < filters.dateRange[0] || record.flowDate > filters.dateRange[1]) {
      return false;
    }
    return true;
  });
}

export function sortRecordsByDate(records: CashFlowRecord[]): CashFlowRecord[] {
  return [...records].sort((a, b) => a.flowDate.localeCompare(b.flowDate));
}

export function groupByCurrency(records: CashFlowRecord[]): Record<string, CashFlowRecord[]> {
  const groups: Record<string, CashFlowRecord[]> = {};
  for (const record of records) {
    if (!groups[record.currency]) {
      groups[record.currency] = [];
    }
    groups[record.currency].push(record);
  }
  return groups;
}

export function groupByMonth(records: CashFlowRecord[]): Record<string, CashFlowRecord[]> {
  const groups: Record<string, CashFlowRecord[]> = {};
  for (const record of records) {
    const month = record.flowDate.substring(0, 7);
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(record);
  }
  return groups;
}

export function getDateRange(records: CashFlowRecord[]): [string, string] {
  if (records.length === 0) return ['2026-06-01', '2026-12-31'];
  const dates = records.map(r => r.flowDate).sort();
  return [dates[0], dates[dates.length - 1]];
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  };
  const symbol = symbols[currency] || '';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}
