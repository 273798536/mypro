import { format, parseISO, differenceInDays, addDays, isWeekend, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (date: string, pattern: string = 'yyyy-MM-dd'): string => {
  try {
    return format(parseISO(date), pattern, { locale: zhCN });
  } catch {
    return date;
  }
};

export const formatDateDisplay = (date: string): string => {
  return formatDate(date, 'yyyy年MM月dd日');
};

export const formatShortDate = (date: string): string => {
  return formatDate(date, 'MM-dd');
};

export const getDaysDiff = (date1: string, date2: string): number => {
  return differenceInDays(parseISO(date1), parseISO(date2));
};

export const isDateEqual = (date1: string, date2: string): boolean => {
  return isSameDay(parseISO(date1), parseISO(date2));
};

export const HOLIDAYS_2026 = [
  '2026-01-01',
  '2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31',
  '2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07',
];

export const isHoliday = (date: string): boolean => {
  const d = parseISO(date);
  const dateStr = format(d, 'yyyy-MM-dd');
  return isWeekend(d) || HOLIDAYS_2026.includes(dateStr);
};

export const getNextBusinessDay = (date: string): string => {
  let current = parseISO(date);
  while (isHoliday(format(current, 'yyyy-MM-dd'))) {
    current = addDays(current, 1);
  }
  return format(current, 'yyyy-MM-dd');
};

export const isHolidayAdjusted = (expectedDate: string, actualDate: string): boolean => {
  if (isDateEqual(expectedDate, actualDate)) return false;
  const nextBusinessDay = getNextBusinessDay(expectedDate);
  return isDateEqual(nextBusinessDay, actualDate);
};

export const getCurrentDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getCurrentDateTime = (): string => {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
};
