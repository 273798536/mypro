import { ValidationError } from '../types';

export const TIMEZONES = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)', offset: 8 },
  { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)', offset: 9 },
  { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', offset: 8 },
  { value: 'America/New_York', label: '美国东部时间 (UTC-5/-4)', offset: -5 },
  { value: 'Europe/London', label: '英国时间 (UTC+0/+1)', offset: 0 },
  { value: 'Australia/Sydney', label: '澳洲东部时间 (UTC+10/+11)', offset: 10 }
];

export function getSystemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getTimezoneOffset(timezone: string): number {
  const tz = TIMEZONES.find(t => t.value === timezone);
  return tz?.offset ?? 0;
}

export function validateTimezone(
  inputTimezone: string,
  expectedTimezone: string,
  source: string,
  sourceLine: number
): ValidationError | null {
  const systemTz = getSystemTimezone();
  
  if (inputTimezone !== expectedTimezone) {
    return {
      id: `tz-error-${Date.now()}`,
      type: 'timezone',
      message: `时区不匹配: 当前设置为 ${inputTimezone}，建议使用 ${expectedTimezone}。系统时区为 ${systemTz}`,
      source,
      sourceLine,
      severity: 'warning',
      timestamp: Date.now()
    };
  }

  return null;
}

export function convertTimeToTimezone(
  date: Date,
  targetTimezone: string
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

  return new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  );
}

export function checkDateBoundaryCrossing(
  startDate: Date,
  endDate: Date,
  timezone: string,
  source: string,
  sourceLine: number
): ValidationError | null {
  const startTz = convertTimeToTimezone(startDate, timezone);
  const endTz = convertTimeToTimezone(endDate, timezone);

  if (startTz.toDateString() !== endTz.toDateString()) {
    return {
      id: `tz-boundary-${Date.now()}`,
      type: 'timezone',
      message: `时间计算跨日期边界: ${startTz.toLocaleString()} -> ${endTz.toLocaleString()} (${timezone})`,
      source,
      sourceLine,
      severity: 'error',
      timestamp: Date.now()
    };
  }

  return null;
}
