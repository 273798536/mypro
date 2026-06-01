import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export const dayjsInstance = dayjs;

export function dateRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = dayjs(start1);
  const e1 = dayjs(end1);
  const s2 = dayjs(start2);
  const e2 = dayjs(end2);
  return s1.isBefore(e2) && e1.isAfter(s2);
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function formatTime(date: string): string {
  return dayjs(date).format('HH:mm');
}

export function getWeekDates(baseDate: string): dayjs.Dayjs[] {
  const startOfWeek = dayjs(baseDate).startOf('isoWeek');
  return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
}

export function getDayHours(): number[] {
  return Array.from({ length: 14 }, (_, i) => i + 8);
}

export function getTimeSlotPosition(
  startTime: string,
  endTime: string,
  viewStart: string,
  totalHours: number = 14,
): { left: number; width: number } {
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  const viewStartHour = dayjs(viewStart).hour(8).minute(0);
  const viewEndHour = dayjs(viewStart).hour(22).minute(0);

  const totalMinutes = viewEndHour.diff(viewStartHour, 'minute');
  const leftMinutes = start.diff(viewStartHour, 'minute');
  const widthMinutes = end.diff(start, 'minute');

  return {
    left: Math.max(0, (leftMinutes / totalMinutes) * 100),
    width: Math.min(100, (widthMinutes / totalMinutes) * 100),
  };
}

export function isSameDay(date1: string, date2: string): boolean {
  return dayjs(date1).isSame(date2, 'day');
}

export function isOverday(startTime: string, endTime: string): boolean {
  return !dayjs(startTime).startOf('day').isSame(dayjs(endTime).startOf('day'));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getDayOfWeek(date: string): number {
  return dayjs(date).isoWeekday();
}

export function getNextOccurrence(
  dayOfWeek: number,
  time: string,
  baseDate: string = dayjs().format('YYYY-MM-DD'),
): string {
  const [hours, minutes] = time.split(':').map(Number);
  const base = dayjs(baseDate).startOf('isoWeek');
  const target = base.add(dayOfWeek - 1, 'day').hour(hours).minute(minutes);
  return target.format('YYYY-MM-DDTHH:mm:ss');
}
