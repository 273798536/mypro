import { format, parseISO, addDays, differenceInDays, isSameDay, isWithinInterval } from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return format(date, DATE_FORMAT);
}

export function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}

export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const days = differenceInDays(end, start);
  
  for (let i = 0; i <= days; i++) {
    dates.push(formatDate(addDays(start, i)));
  }
  return dates;
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return isWithinInterval(parseDate(date), {
    start: parseDate(startDate),
    end: parseDate(endDate)
  });
}

export function getShiftHours(shiftType: string): number {
  const hours: Record<string, number> = {
    morning: 8,
    afternoon: 8,
    night: 8,
    off: 0
  };
  return hours[shiftType] || 0;
}

export function isNightShift(shiftType: string): boolean {
  return shiftType === 'night';
}

export function getConsecutiveDays(dates: string[], targetDate: string, direction: 'before' | 'after' | 'both' = 'both'): string[] {
  const sortedDates = [...dates].sort();
  const targetIndex = sortedDates.findIndex(d => isSameDay(parseDate(d), parseDate(targetDate)));
  
  if (targetIndex === -1) return [];
  
  const consecutive: string[] = [];
  
  if (direction === 'before' || direction === 'both') {
    let i = targetIndex - 1;
    while (i >= 0) {
      const expectedDate = formatDate(addDays(parseDate(targetDate), -(targetIndex - i)));
      if (sortedDates[i] === expectedDate) {
        consecutive.push(sortedDates[i]);
        i--;
      } else {
        break;
      }
    }
  }
  
  if (direction === 'after' || direction === 'both') {
    let i = targetIndex + 1;
    while (i < sortedDates.length) {
      const expectedDate = formatDate(addDays(parseDate(targetDate), i - targetIndex));
      if (sortedDates[i] === expectedDate) {
        consecutive.push(sortedDates[i]);
        i++;
      } else {
        break;
      }
    }
  }
  
  return consecutive;
}
