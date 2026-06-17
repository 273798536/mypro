import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export function formatDate(
  date: string | number | Date | dayjs.Dayjs,
  format: string = DATE_FORMAT,
): string {
  return dayjs(date).format(format);
}

export function formatDateTime(
  date: string | number | Date | dayjs.Dayjs,
  format: string = DATETIME_FORMAT,
): string {
  return dayjs(date).format(format);
}

export interface DateRange {
  start: string;
  end: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
}

export function getRecentDays(
  n: number,
  endDate: string | number | Date | dayjs.Dayjs = dayjs(),
): DateRange {
  const end = dayjs(endDate);
  const start = end.subtract(n - 1, 'day');

  return {
    start: start.format(DATE_FORMAT),
    end: end.format(DATE_FORMAT),
    startDate: start,
    endDate: end,
  };
}

export function isDateInRange(
  date: string | number | Date | dayjs.Dayjs,
  range: DateRange,
): boolean {
  return dayjs(date).isBetween(range.startDate, range.endDate, null, '[]');
}

export function getDateListInRange(range: DateRange): string[] {
  const dates: string[] = [];
  let current = range.startDate;

  while (current.isBefore(range.endDate) || current.isSame(range.endDate, 'day')) {
    dates.push(current.format(DATE_FORMAT));
    current = current.add(1, 'day');
  }

  return dates;
}
