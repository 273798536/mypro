import dayjs from 'dayjs';

export function formatDate(date: Date | string | null, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!date) return '-';
  return dayjs(date).format(format);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount);
}

export function generateNo(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, '0')}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function safeJsonParse(str: string, defaultValue: any = null): any {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}