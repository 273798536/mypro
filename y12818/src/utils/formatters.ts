/**
 * 日期与数字格式化工具
 * 提供统一的日期、数字、百分比、货币等格式化能力
 */

import { format, formatDistanceToNow, formatISO, isValid, parse, parseISO, differenceInDays, differenceInHours, differenceInMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/** ============================================
 *  日期格式化
 * ============================================ */

/**
 * 日期格式预设
 */
export const DATE_FORMATS = {
  /** ISO 标准格式: 2024-01-15T08:30:00+08:00 */
  ISO: 'iso',
  /** 仅日期: 2024-01-15 */
  DATE: 'yyyy-MM-dd',
  /** 日期中文: 2024年1月15日 */
  DATE_CN: 'yyyy年M月d日',
  /** 仅时间: 08:30:00 */
  TIME: 'HH:mm:ss',
  /** 仅时间(无秒): 08:30 */
  TIME_SHORT: 'HH:mm',
  /** 日期+时间: 2024-01-15 08:30:00 */
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  /** 日期+时间(无秒): 2024-01-15 08:30 */
  DATETIME_SHORT: 'yyyy-MM-dd HH:mm',
  /** 日期+时间中文: 2024年1月15日 08:30 */
  DATETIME_CN: 'yyyy年M月d日 HH:mm',
  /** 年月: 2024-01 */
  YEAR_MONTH: 'yyyy-MM',
  /** 年月中文: 2024年1月 */
  YEAR_MONTH_CN: 'yyyy年M月',
  /** 月日: 01-15 */
  MONTH_DAY: 'MM-dd',
  /** 月日中文: 1月15日 */
  MONTH_DAY_CN: 'M月d日',
  /** 相对时间: 3小时前 */
  RELATIVE: 'relative',
  /** 友好格式: 今天 08:30 / 昨天 08:30 / 2024-01-15 08:30 */
  FRIENDLY: 'friendly',
} as const;

export type DateFormat = (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS];

/**
 * 将任意日期输入转换为 Date 对象
 * @param date 日期输入 (字符串/数字/Date/null/undefined)
 * @param fallback 转换失败时的回退值
 */
export function toDate(
  date: string | number | Date | null | undefined,
  fallback: Date | null = null
): Date | null {
  if (date === null || date === undefined) {
    return fallback;
  }

  if (date instanceof Date) {
    return isValid(date) ? date : fallback;
  }

  if (typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : fallback;
  }

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) {
      return fallback;
    }

    const parsed = parseISO(trimmed);
    if (isValid(parsed)) {
      return parsed;
    }

    const direct = new Date(trimmed);
    if (isValid(direct)) {
      return direct;
    }

    const formats = [
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd HH:mm',
      'yyyy-MM-dd',
      'yyyy/MM/dd HH:mm:ss',
      'yyyy/MM/dd HH:mm',
      'yyyy/MM/dd',
      'yyyy.MM.dd HH:mm:ss',
      'yyyy.MM.dd',
    ];

    for (const fmt of formats) {
      const p = parse(trimmed, fmt, new Date());
      if (isValid(p)) {
        return p;
      }
    }
  }

  return fallback;
}

/**
 * 格式化日期
 * @param date 日期输入
 * @param formatType 格式预设或自定义格式字符串, 默认 DATE_FORMATS.DATETIME
 * @param fallback 格式化失败时的显示文本
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  formatType: DateFormat = DATE_FORMATS.DATETIME,
  fallback = '--'
): string {
  const d = toDate(date);
  if (d === null) {
    return fallback;
  }

  try {
    if (formatType === 'iso') {
      return formatISO(d);
    }

    if (formatType === 'relative') {
      return formatDistanceToNow(d, {
        addSuffix: true,
        locale: zhCN,
      });
    }

    if (formatType === 'friendly') {
      const now = new Date();
      const today = startOfDay(now);
      const yesterday = startOfDay(subDays(now, 1));
      const dateDay = startOfDay(d);
      const dayDiff = differenceInDays(dateDay, today);

      const timeStr = format(d, DATE_FORMATS.TIME_SHORT, { locale: zhCN });

      if (dayDiff === 0) {
        return `今天 ${timeStr}`;
      }
      if (dayDiff === -1 || dateDay.getTime() === yesterday.getTime()) {
        return `昨天 ${timeStr}`;
      }
      if (dayDiff === 1) {
        return `明天 ${timeStr}`;
      }

      if (dayDiff > -7 && dayDiff < 7) {
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${weekDays[d.getDay()]} ${timeStr}`;
      }

      const sameYear = d.getFullYear() === now.getFullYear();
      if (sameYear) {
        return format(d, DATE_FORMATS.MONTH_DAY_CN, { locale: zhCN }) + ` ${timeStr}`;
      }

      return format(d, DATE_FORMATS.DATETIME_SHORT, { locale: zhCN });
    }

    return format(d, formatType, { locale: zhCN });
  } catch (error) {
    console.warn('[Formatter] 日期格式化失败:', error);
    return fallback;
  }
}

/**
 * 格式化日期为仅日期 (yyyy-MM-dd)
 */
export function formatDateOnly(
  date: string | number | Date | null | undefined,
  fallback?: string
): string {
  return formatDate(date, DATE_FORMATS.DATE, fallback);
}

/**
 * 格式化日期为中文日期 (2024年1月15日)
 */
export function formatDateCn(
  date: string | number | Date | null | undefined,
  fallback?: string
): string {
  return formatDate(date, DATE_FORMATS.DATE_CN, fallback);
}

/**
 * 格式化日期时间 (yyyy-MM-dd HH:mm:ss)
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  fallback?: string
): string {
  return formatDate(date, DATE_FORMATS.DATETIME, fallback);
}

/**
 * 格式化日期时间简写 (yyyy-MM-dd HH:mm)
 */
export function formatDateTimeShort(
  date: string | number | Date | null | undefined,
  fallback?: string
): string {
  return formatDate(date, DATE_FORMATS.DATETIME_SHORT, fallback);
}

/**
 * 格式化为相对时间 (如: 3小时前)
 */
export function formatRelativeTime(
  date: string | number | Date | null | undefined,
  fallback?: string
): string {
  return formatDate(date, DATE_FORMATS.RELATIVE, fallback);
}

/**
 * 友好时间格式
 */
export function formatFriendlyTime(
  date: string | number | Date | null | undefined,
  fallback?: string
): string {
  return formatDate(date, DATE_FORMATS.FRIENDLY, fallback);
}

/** ============================================
 *  日期范围格式化
 * ============================================ */

/**
 * 格式化日期范围
 */
export function formatDateRange(
  start: string | number | Date | null | undefined,
  end: string | number | Date | null | undefined,
  separator = ' ~ ',
  fallback = '--'
): string {
  const startStr = formatDateOnly(start, '');
  const endStr = formatDateOnly(end, '');

  if (!startStr && !endStr) {
    return fallback;
  }
  if (!startStr) {
    return `至 ${endStr}`;
  }
  if (!endStr) {
    return `从 ${startStr}`;
  }
  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr}${separator}${endStr}`;
}

/**
 * 获取今天的日期范围 (00:00:00 ~ 23:59:59)
 */
export function getTodayRange(): { start: Date; end: Date } {
  return {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  };
}

/**
 * 获取本月的日期范围
 */
export function getMonthRange(date?: Date): { start: Date; end: Date } {
  const d = date ?? new Date();
  return {
    start: startOfMonth(d),
    end: endOfMonth(d),
  };
}

/**
 * 获取本年的日期范围
 */
export function getYearRange(date?: Date): { start: Date; end: Date } {
  const d = date ?? new Date();
  return {
    start: startOfYear(d),
    end: endOfYear(d),
  };
}

/** ============================================
 *  时间差计算
 * ============================================ */

/**
 * 时间差结果
 */
export interface DurationResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  totalHours: number;
  totalMinutes: number;
}

/**
 * 计算两个日期之间的时间差
 */
export function getDuration(
  start: string | number | Date | null | undefined,
  end: string | number | Date | null | undefined
): DurationResult | null {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!startDate || !endDate) {
    return null;
  }

  const totalMs = endDate.getTime() - startDate.getTime();
  const absMs = Math.abs(totalMs);

  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absMs % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    totalHours: differenceInHours(endDate, startDate),
    totalMinutes: differenceInMinutes(endDate, startDate),
  };
}

/**
 * 格式化时间差为可读文本 (如: 2天3小时15分)
 */
export function formatDuration(
  start: string | number | Date | null | undefined,
  end: string | number | Date | null | undefined,
  options?: {
    showSeconds?: boolean;
    maxParts?: number;
  }
): string {
  const duration = getDuration(start, end);
  if (!duration) {
    return '--';
  }

  const showSeconds = options?.showSeconds ?? false;
  const maxParts = options?.maxParts ?? 3;

  const parts: string[] = [];

  if (duration.days > 0) {
    parts.push(`${duration.days}天`);
  }
  if (duration.hours > 0) {
    parts.push(`${duration.hours}小时`);
  }
  if (duration.minutes > 0) {
    parts.push(`${duration.minutes}分`);
  }
  if (showSeconds && duration.seconds > 0) {
    parts.push(`${duration.seconds}秒`);
  }

  if (parts.length === 0) {
    return showSeconds ? '0秒' : '0分';
  }

  return parts.slice(0, maxParts).join('');
}

/** ============================================
 *  日期偏移计算
 * ============================================ */

/**
 * 日期偏移单位
 */
export type DateOffsetUnit = 'day' | 'month' | 'year';

/**
 * 计算偏移后的日期
 */
export function offsetDate(
  date: string | number | Date | null | undefined,
  amount: number,
  unit: DateOffsetUnit = 'day'
): Date | null {
  const d = toDate(date);
  if (!d) return null;

  switch (unit) {
    case 'day':
      return amount >= 0 ? addDays(d, amount) : subDays(d, Math.abs(amount));
    case 'month':
      return amount >= 0 ? addMonths(d, amount) : subMonths(d, Math.abs(amount));
    case 'year':
      return amount >= 0 ? addYears(d, amount) : subYears(d, Math.abs(amount));
  }
}

/** ============================================
 *  数字格式化
 * ============================================ */

/**
 * 格式化数字
 * @param value 数字值
 * @param options 格式化选项
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: {
    /** 小数位数 */
    decimals?: number;
    /** 是否添加千分位分隔符, 默认 true */
    thousandSeparator?: boolean;
    /** 四舍五入, 默认 true */
    rounding?: boolean;
    /** 舍入模式 */
    roundingMode?: 'round' | 'floor' | 'ceil';
    /** 最小值限制 */
    min?: number;
    /** 最大值限制 */
    max?: number;
    /** 格式化失败时的显示文本 */
    fallback?: string;
    /** 是否显示正号 */
    showSign?: boolean;
    /** 前缀 */
    prefix?: string;
    /** 后缀 */
    suffix?: string;
    /** 末尾去除多余的0, 默认 false */
    trimZeros?: boolean;
  } = {}
): string {
  const {
    decimals,
    thousandSeparator = true,
    rounding = true,
    roundingMode = 'round',
    min,
    max,
    fallback = '--',
    showSign = false,
    prefix = '',
    suffix = '',
    trimZeros = false,
  } = options;

  let num: number;
  if (typeof value === 'string') {
    num = parseFloat(value);
    if (Number.isNaN(num)) {
      return fallback;
    }
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    num = value;
  } else {
    return fallback;
  }

  if (min !== undefined) {
    num = Math.max(num, min);
  }
  if (max !== undefined) {
    num = Math.min(num, max);
  }

  let formatted: string;

  if (decimals !== undefined) {
    const factor = Math.pow(10, decimals);
    let scaled: number;
    switch (roundingMode) {
      case 'floor':
        scaled = Math.floor(num * factor) / factor;
        break;
      case 'ceil':
        scaled = Math.ceil(num * factor) / factor;
        break;
      case 'round':
      default:
        scaled = rounding ? Math.round(num * factor) / factor : num;
    }
    formatted = scaled.toFixed(decimals);
  } else {
    formatted = String(rounding ? Math.round(num) : num);
  }

  if (trimZeros && decimals !== undefined) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  if (thousandSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  if (showSign && num > 0) {
    formatted = `+${formatted}`;
  }

  return `${prefix}${formatted}${suffix}`;
}

/**
 * 格式化整数 (带千分位)
 */
export function formatInteger(
  value: number | string | null | undefined,
  options?: {
    thousandSeparator?: boolean;
    showSign?: boolean;
    fallback?: string;
  }
): string {
  return formatNumber(value, {
    decimals: 0,
    ...options,
  });
}

/**
 * 格式化浮点数
 */
export function formatFloat(
  value: number | string | null | undefined,
  decimals = 2,
  options?: {
    thousandSeparator?: boolean;
    trimZeros?: boolean;
    fallback?: string;
  }
): string {
  return formatNumber(value, {
    decimals,
    ...options,
  });
}

/** ============================================
 *  百分比格式化
 * ============================================ */

/**
 * 格式化百分比
 * @param value 百分比值 (传 0.85 表示 85%)
 */
export function formatPercent(
  value: number | string | null | undefined,
  options: {
    /** 小数位数, 默认 1 */
    decimals?: number;
    /** 是否自动乘以 100, 默认 true (传 0.85 -> 85%) */
    multiply?: boolean;
    /** 是否显示正号 */
    showSign?: boolean;
    /** 格式化失败时的显示文本 */
    fallback?: string;
  } = {}
): string {
  const { decimals = 1, multiply = true, showSign = false, fallback = '--' } = options;

  let num: number;
  if (typeof value === 'string') {
    num = parseFloat(value);
    if (Number.isNaN(num)) {
      return fallback;
    }
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    num = value;
  } else {
    return fallback;
  }

  const displayValue = multiply ? num * 100 : num;

  return formatNumber(displayValue, {
    decimals,
    thousandSeparator: false,
    showSign,
    suffix: '%',
    fallback,
  });
}

/** ============================================
 *  货币格式化
 * ============================================ */

/**
 * 货币类型
 */
export type Currency = 'CNY' | 'USD' | 'EUR';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
};

/**
 * 格式化货币金额
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: {
    /** 货币类型, 默认 CNY */
    currency?: Currency;
    /** 小数位数, 默认 2 */
    decimals?: number;
    /** 是否显示货币符号, 默认 true */
    showSymbol?: boolean;
    /** 格式化失败时的显示文本 */
    fallback?: string;
  } = {}
): string {
  const { currency = 'CNY', decimals = 2, showSymbol = true, fallback = '--' } = options;

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    return fallback;
  }

  const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] : '';

  return formatNumber(num, {
    decimals,
    thousandSeparator: true,
    prefix: symbol,
    fallback,
  });
}

/** ============================================
 *  文件大小格式化
 * ============================================ */

/** 文件大小单位 */
export type FileSizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';

const FILE_SIZE_UNITS: FileSizeUnit[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * 格式化文件大小
 * @param bytes 字节数
 */
export function formatFileSize(
  bytes: number | string | null | undefined,
  options: {
    /** 小数位数, 默认 1 */
    decimals?: number;
    /** 强制使用指定单位, 默认自动选择最合适的 */
    forceUnit?: FileSizeUnit;
    /** 单位与数字之间的分隔符, 默认 ' ' */
    separator?: string;
    /** 格式化失败时的显示文本 */
    fallback?: string;
  } = {}
): string {
  const { decimals = 1, forceUnit, separator = ' ', fallback = '--' } = options;

  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) {
    return fallback;
  }

  if (num === 0) {
    return `0${separator}B`;
  }

  let unitIndex: number;
  if (forceUnit) {
    unitIndex = FILE_SIZE_UNITS.indexOf(forceUnit);
    if (unitIndex === -1) unitIndex = 0;
  } else {
    unitIndex = Math.floor(Math.log(num) / Math.log(1024));
    unitIndex = Math.min(unitIndex, FILE_SIZE_UNITS.length - 1);
  }

  const value = num / Math.pow(1024, unitIndex);
  const unit = FILE_SIZE_UNITS[unitIndex];

  return `${formatNumber(value, {
    decimals,
    thousandSeparator: true,
  })}${separator}${unit}`;
}

/** ============================================
 *  其他格式化工具
 * ============================================ */

/**
 * 格式化置信度等级
 */
export function formatConfidenceLevel(
  score: number | null | undefined
): { label: string; level: 'high' | 'medium' | 'low'; color: string } {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return { label: '未知', level: 'low', color: 'text-gray-500' };
  }

  if (score >= 80) {
    return { label: '高置信', level: 'high', color: 'text-emerald-success' };
  }
  if (score >= 60) {
    return { label: '中置信', level: 'medium', color: 'text-amber-warning' };
  }
  return { label: '低置信', level: 'low', color: 'text-danger-red' };
}

/**
 * 格式化优先级标签
 */
export function formatPriority(
  priority: 1 | 2 | 3 | number | null | undefined
): { label: string; className: string } {
  switch (priority) {
    case 1:
      return { label: '高', className: 'bg-danger-red/10 text-danger-red' };
    case 2:
      return { label: '中', className: 'bg-amber-warning/10 text-amber-warning' };
    case 3:
      return { label: '低', className: 'bg-slate-500/10 text-slate-600' };
    default:
      return { label: '未知', className: 'bg-gray-100 text-gray-500' };
  }
}

/**
 * 截断字符串到指定长度 (中文按 2 个字符计算)
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  options: {
    /** 省略号 */
    ellipsis?: string;
    /** 是否按中文2字符计算 */
    chineseAsDouble?: boolean;
  } = {}
): string {
  if (text === null || text === undefined) {
    return '';
  }

  const { ellipsis = '...', chineseAsDouble = false } = options;

  if (!chineseAsDouble) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + ellipsis;
  }

  let currentLength = 0;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charLength = /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
    if (currentLength + charLength > maxLength) {
      return result + ellipsis;
    }
    currentLength += charLength;
    result += char;
  }
  return result;
}

/**
 * 首字母大写
 */
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 格式化数组为可读文本 (如: 北京, 上海, 广州)
 */
export function formatArray(
  items: Array<unknown> | null | undefined,
  options: {
    separator?: string;
    lastSeparator?: string;
    emptyText?: string;
    maxItems?: number;
  } = {}
): string {
  if (!items || items.length === 0) {
    return options.emptyText ?? '--';
  }

  const { separator = ', ', lastSeparator, maxItems } = options;
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const strs = displayItems.map((item) => String(item));

  if (strs.length === 1) {
    return strs[0];
  }

  if (lastSeparator && strs.length >= 2) {
    const last = strs[strs.length - 1];
    const rest = strs.slice(0, -1).join(separator);
    return `${rest}${lastSeparator}${last}`;
  }

  return strs.join(separator);
}

/**
 * 高亮匹配文本 (用于搜索结果高亮)
 * 返回分割后的片段数组 [{ text: string, highlight: boolean }]
 */
export function highlightText(
  text: string | null | undefined,
  keyword: string | null | undefined
): Array<{ text: string; highlight: boolean }> {
  if (!text) return [{ text: '', highlight: false }];
  if (!keyword) return [{ text, highlight: false }];

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  const indices: number[] = [];
  let idx = lowerText.indexOf(lowerKeyword);
  while (idx !== -1) {
    indices.push(idx);
    idx = lowerText.indexOf(lowerKeyword, idx + 1);
  }

  if (indices.length === 0) {
    return [{ text, highlight: false }];
  }

  const result: Array<{ text: string; highlight: boolean }> = [];
  let lastEnd = 0;
  const kwLen = keyword.length;

  indices.forEach((start) => {
    if (start > lastEnd) {
      result.push({
        text: text.slice(lastEnd, start),
        highlight: false,
      });
    }
    result.push({
      text: text.slice(start, start + kwLen),
      highlight: true,
    });
    lastEnd = start + kwLen;
  });

  if (lastEnd < text.length) {
    result.push({
      text: text.slice(lastEnd),
      highlight: false,
    });
  }

  return result;
}
