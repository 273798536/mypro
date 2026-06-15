import { toZonedTime, formatInTimeZone, format } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';

export interface TimezoneCorrected {
  originalTime: Date;
  originalTimezone: string;
  correctedTime: Date;
  correctedTimezone: string;
  correctionExplanation: string;
}

export const COMMON_TIMEZONES = {
  'Asia/Shanghai': '东八区（北京时间）',
  'Asia/Tokyo': '东九区（东京时间）',
  'Asia/Hong_Kong': '东八区（香港时间）',
  'UTC': 'UTC 标准时间',
  'Etc/GMT-8': '东八区',
  'Etc/GMT-9': '东九区',
};

export function normalizeTimezone(tz: string): string {
  const normalized = tz.trim();
  if (normalized === '东八区' || normalized === 'GMT+8' || normalized === 'UTC+8' || normalized === 'CST') {
    return 'Asia/Shanghai';
  }
  if (normalized === '东九区' || normalized === 'GMT+9' || normalized === 'UTC+9' || normalized === 'JST') {
    return 'Asia/Tokyo';
  }
  if (normalized === 'UTC' || normalized === 'GMT') {
    return 'UTC';
  }
  return normalized || 'Asia/Shanghai';
}

export function correctTimezone(
  time: Date,
  originalTimezone: string,
  targetTimezone: string = 'Asia/Shanghai'
): TimezoneCorrected {
  const normalizedOriginal = normalizeTimezone(originalTimezone);
  const normalizedTarget = normalizeTimezone(targetTimezone);

  const originalZoned = toZonedTime(time, normalizedOriginal);
  const correctedZoned = toZonedTime(originalZoned, normalizedTarget);

  const originalTzName = COMMON_TIMEZONES[normalizedOriginal as keyof typeof COMMON_TIMEZONES] || normalizedOriginal;
  const targetTzName = COMMON_TIMEZONES[normalizedTarget as keyof typeof COMMON_TIMEZONES] || normalizedTarget;

  let correctionExplanation: string;
  if (normalizedOriginal === normalizedTarget) {
    correctionExplanation = `原始记录使用${originalTzName}，与目标时区一致，无需校正。`;
  } else {
    const originalFormatted = formatInTimeZone(originalZoned, normalizedOriginal, 'yyyy-MM-dd HH:mm', { locale: zhCN });
    const correctedFormatted = formatInTimeZone(correctedZoned, normalizedTarget, 'yyyy-MM-dd HH:mm', { locale: zhCN });
    correctionExplanation = `原始记录使用${originalTzName}（${originalFormatted}），已校正为${targetTzName}（${correctedFormatted}）。请确认时区校正是否正确。`;
  }

  return {
    originalTime: time,
    originalTimezone: normalizedOriginal,
    correctedTime: correctedZoned,
    correctedTimezone: normalizedTarget,
    correctionExplanation,
  };
}

export function detectTimezoneIssues(
  records: { timezone: string; recordTime: Date }[],
  expectedTimezone: string = 'Asia/Shanghai'
): { errors: { recordIndex: number; current: string; expected: string; explanation: string }[]; explanation: string } {
  const errors: { recordIndex: number; current: string; expected: string; explanation: string }[] = [];
  const timezones = new Set<string>();

  records.forEach((record, index) => {
    const normalized = normalizeTimezone(record.timezone);
    timezones.add(normalized);
    if (normalized !== normalizeTimezone(expectedTimezone)) {
      const currentTzName = COMMON_TIMEZONES[normalized as keyof typeof COMMON_TIMEZONES] || normalized;
      const expectedTzName = COMMON_TIMEZONES[normalizeTimezone(expectedTimezone) as keyof typeof COMMON_TIMEZONES] || expectedTimezone;
      errors.push({
        recordIndex: index,
        current: normalized,
        expected: normalizeTimezone(expectedTimezone),
        explanation: `第${index + 1}条记录时区为${currentTzName}，与预期${expectedTzName}不符，请校正后再使用。`,
      });
    }
  });

  const tzList = Array.from(timezones)
    .map(tz => COMMON_TIMEZONES[tz as keyof typeof COMMON_TIMEZONES] || tz)
    .join('、');

  const explanation = timezones.size > 1
    ? `检测到${timezones.size}种时区混用：${tzList}。请统一校正后再进行计算。`
    : `所有记录时区一致，均为${tzList}。`;

  return { errors, explanation };
}

export function formatTimeWithTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd HH:mm zzz', { locale: zhCN });
}
