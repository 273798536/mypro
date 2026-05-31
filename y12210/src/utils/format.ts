import dayjs from 'dayjs';

export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(date: string | Date | number, format: string = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date | number): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function generateVersion(): string {
  return dayjs().format('YYYYMMDD-HHmmss');
}

export function generatePeriod(): string {
  return dayjs().format('YYYY-MM');
}

export function getPreviousPeriod(period: string): string {
  return dayjs(period + '-01').subtract(1, 'month').format('YYYY-MM');
}

export function parsePeriod(period: string): { start: string; end: string } {
  const start = dayjs(period + '-01');
  return {
    start: start.startOf('month').format('YYYY-MM-DD'),
    end: start.endOf('month').format('YYYY-MM-DD'),
  };
}

export function generateCollectionNo(period: string, index: number): string {
  const padded = String(index).padStart(6, '0');
  return `COL-${period.replace(/-/g, '')}-${padded}`;
}

export function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function groupBy<T, K extends keyof any>(arr: T[], key: (item: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const groupKey = key(item);
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
