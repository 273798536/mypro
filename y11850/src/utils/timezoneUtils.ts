export const STANDARD_TIMEZONES: Record<string, { offset: number; name: string; region: string }> = {
  'UTC': { offset: 0, name: '协调世界时', region: '全球' },
  'UTC+8': { offset: 8, name: '中国标准时间', region: '中国北京' },
  'UTC+9': { offset: 9, name: '日本标准时间', region: '日本东京' },
  'UTC+1': { offset: 1, name: '中欧时间', region: '欧洲中部' },
  'UTC-5': { offset: -5, name: '东部标准时间', region: '美国东部' },
  'UTC-8': { offset: -8, name: '太平洋标准时间', region: '美国西部' },
  'UTC+10': { offset: 10, name: '澳大利亚东部时间', region: '澳大利亚悉尼' },
  'UTC+5:30': { offset: 5.5, name: '印度标准时间', region: '印度新德里' },
};

export interface TimezoneValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    humanMessage: string;
    step: string;
    details: Record<string, unknown>;
  };
  normalizedTimezone?: string;
}

export function parseTimezone(timezone: string): number | null {
  const match = timezone.match(/^UTC([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (timezone === 'UTC') return 0;
  if (!match) return null;
  
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  
  if (hours > 14 || (hours === 14 && minutes > 0)) return null;
  if (minutes !== 0 && minutes !== 30 && minutes !== 45) return null;
  
  return sign * (hours + minutes / 60);
}

export function getTimezoneForLocation(lat: number, lng: number): string {
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) return 'UTC+8';
  if (lat >= 30 && lat <= 46 && lng >= 128 && lng <= 146) return 'UTC+9';
  if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) return 'UTC+10';
  if (lat >= 8 && lat <= 38 && lng >= 68 && lng <= 98) return 'UTC+5:30';
  if (lat >= 36 && lat <= 61 && lng >= -10 && lng <= 2) return 'UTC+1';
  if (lat >= 24 && lat <= 50 && lng >= -88 && lng <= -66) return 'UTC-5';
  if (lat >= 32 && lat <= 49 && lng >= -125 && lng <= -114) return 'UTC-8';
  return 'UTC';
}

export function validateTimezone(timezone: string, latitude?: number, longitude?: number): TimezoneValidationResult {
  const step = '时区格式校验';
  
  if (!timezone || timezone.trim() === '') {
    return {
      valid: false,
      error: {
        code: 'TIMEZONE_EMPTY',
        message: '时区字段为空',
        humanMessage: '数据包中缺少时区信息，请确认数据来源',
        step,
        details: { field: 'timezone', value: timezone },
      },
    };
  }

  const trimmedTz = timezone.trim().toUpperCase().replace(/\s+/g, '');
  const offset = parseTimezone(trimmedTz);
  
  if (offset === null) {
    return {
      valid: false,
      error: {
        code: 'TIMEZONE_FORMAT_INVALID',
        message: `时区格式不正确: ${timezone}`,
        humanMessage: `时区"${timezone}"格式不对，请使用"UTC±X"格式，例如"UTC+8"表示北京时间`,
        step,
        details: { field: 'timezone', value: timezone, expectedFormat: 'UTC±X' },
      },
    };
  }

  if (!STANDARD_TIMEZONES[trimmedTz]) {
    return {
      valid: false,
      error: {
        code: 'TIMEZONE_NON_STANDARD',
        message: `非标准时区: ${timezone}`,
        humanMessage: `时区"${timezone}"不常见，如果项目位于中国请使用"UTC+8"`,
        step,
        details: { field: 'timezone', value: timezone, standardTimezones: Object.keys(STANDARD_TIMEZONES) },
      },
    };
  }

  if (latitude !== undefined && longitude !== undefined) {
    const expectedTz = getTimezoneForLocation(latitude, longitude);
    if (expectedTz !== trimmedTz) {
      const expectedOffset = parseTimezone(expectedTz)!;
      const actualOffset = offset;
      const diffHours = expectedOffset - actualOffset;
      
      return {
        valid: false,
        error: {
          code: 'TIMEZONE_MISMATCH_LOCATION',
          message: `时区与经纬度不匹配: 期望${expectedTz}, 实际${trimmedTz}`,
          humanMessage: `您的数据使用了${trimmedTz}时区，但根据经纬度判断项目位于${STANDARD_TIMEZONES[expectedTz].region}（${expectedTz}），这会导致日出日落时间偏差${Math.abs(diffHours)}小时`,
          step: '时区与地理位置匹配校验',
          details: {
            field: 'timezone',
            actual: timezone,
            expected: expectedTz,
            latitude,
            longitude,
            timeDiffHours: diffHours,
          },
        },
      };
    }
  }

  return {
    valid: true,
    normalizedTimezone: trimmedTz,
  };
}

export function getTimezoneHumanMessage(offset: number): string {
  const sign = offset >= 0 ? '+' : '';
  const hours = Math.floor(Math.abs(offset));
  const minutes = Math.round((Math.abs(offset) - hours) * 60);
  const timeStr = minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${hours}`;
  return `UTC${sign}${timeStr}`;
}
