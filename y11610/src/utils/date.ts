import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: string | Date, pattern: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: zhCN });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

export function formatDateChinese(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年MM月dd日', { locale: zhCN });
}

export function getDaysDiff(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return Math.abs(differenceInDays(d1, d2));
}

export function isDateWithinDays(
  date: string | Date,
  days: number,
  referenceDate: string | Date = new Date()
): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const ref = typeof referenceDate === 'string' ? parseISO(referenceDate) : referenceDate;
  const diff = differenceInDays(ref, d);
  return diff >= 0 && diff <= days;
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const dates: string[] = [];
  let current = start;

  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }

  return dates;
}

export function getMonthRange(monthsBack: number = 0): { start: string; end: string } {
  const now = new Date();
  const target = subMonths(now, monthsBack);
  const start = startOfMonth(target);
  const end = endOfMonth(target);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export function getRecentDays(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    dates.push(format(date, 'yyyy-MM-dd'));
  }

  return dates;
}

export function isInRange(date: string, start: string, end: string): boolean {
  return isWithinInterval(parseISO(date), {
    start: parseISO(start),
    end: parseISO(end),
  });
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
}
