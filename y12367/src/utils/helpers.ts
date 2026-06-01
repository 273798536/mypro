import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AnomalyType, TemperatureObjectType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatNumber(value: number, precision: number = 2): string {
  return value.toFixed(precision);
}

export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDateShort(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, 'MM-dd HH:mm');
}

export function formatDateOnly(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function getAnomalyColor(type: AnomalyType): string {
  switch (type) {
    case 'speed_missing': return '#3B82F6';
    case 'temp_overlimit': return '#F59E0B';
    case 'power_reverse': return '#EF4444';
    default: return '#64748B';
  }
}

export function getAnomalyBadgeClass(type: AnomalyType): string {
  switch (type) {
    case 'speed_missing': return 'anomaly-badge-speed';
    case 'temp_overlimit': return 'anomaly-badge-temp';
    case 'power_reverse': return 'anomaly-badge-power';
    default: return '';
  }
}

export function getAnomalyTypeName(type: AnomalyType): string {
  switch (type) {
    case 'speed_missing': return '转速缺采';
    case 'temp_overlimit': return '温升超限';
    case 'power_reverse': return '功率反号';
    default: return '未知异常';
  }
}

export function getTemperatureObjectName(type: TemperatureObjectType): string {
  switch (type) {
    case 'winding': return '绕组';
    case 'bearing': return '轴承';
    case 'housing': return '外壳';
    default: return '未知';
  }
}

export function getMaterialTypeName(type: string): string {
  switch (type) {
    case 'copper': return '铜';
    case 'aluminum': return '铝';
    case 'steel': return '钢';
    default: return '其他';
  }
}

export function getStatusName(status: string): string {
  switch (status) {
    case 'online': return '在线';
    case 'offline': return '离线';
    case 'maintenance': return '维护中';
    default: return '未知';
  }
}

export function getSegmentColor(index: number): string {
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
  return colors[index % colors.length];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

export function calculateEfficiency(inputPower: number, outputPower: number): number {
  if (inputPower === 0) return 0;
  return (outputPower / inputPower) * 100;
}

export function calculateOutputPower(speed: number, torque: number): number {
  return (speed * torque) / 9550;
}

export function formatAnomalyMessage(
  type: AnomalyType,
  materialCode: string,
  testBenchCode: string,
  timestamp: Date,
  actualValue: number,
  threshold: number,
  objectType?: string,
  segmentName?: string,
  duration?: number
): string {
  const timeStr = formatDate(timestamp);
  
  switch (type) {
    case 'speed_missing':
      return `【材料：${materialCode}】测试台${testBenchCode}在${timeStr}转速采样缺失，间隔${actualValue.toFixed(0)}ms > 阈值${threshold}ms`;
    case 'temp_overlimit':
      const obj = objectType || '未知对象';
      const seg = segmentName ? `工况${segmentName}` : '';
      const dur = duration ? `，持续${duration.toFixed(0)}s` : '';
      return `【对象：${obj}】${materialCode}在${seg}温度${actualValue.toFixed(1)}°C > 上限${threshold}°C${dur}`;
    case 'power_reverse':
      return `【测试点：${testBenchCode}】${materialCode}在${timeStr}功率${actualValue.toFixed(2)}kW符号异常`;
    default:
      return '未知异常';
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
