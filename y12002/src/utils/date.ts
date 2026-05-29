import { format, parseISO, isValid, differenceInDays, isAfter, isBefore, isEqual } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: string | Date, pattern: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, pattern, { locale: zhCN });
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
}

export function parseDate(dateStr: string): Date | null {
  const d = parseISO(dateStr);
  return isValid(d) ? d : null;
}

export function isDateExpired(dateStr: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(d, today);
}

export function isDateExpiringSoon(dateStr: string, days: number = 30): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  return (isAfter(d, today) || isEqual(d, today)) && isBefore(d, futureDate);
}

export function daysUntilExpire(dateStr: string): number {
  const d = parseDate(dateStr);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(d, today);
}

export function generateBatchNo(prefix: string = 'BATCH'): string {
  const now = new Date();
  const timestamp = format(now, 'yyyyMMddHHmmss');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateId(prefix: string = 'ID'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
