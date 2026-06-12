import type { RiskLevel, DataStatus } from '@/types';

export const riskColors: Record<RiskLevel, string> = {
  safe: '#2ED573',
  warning: '#FFD166',
  danger: '#FF6B35',
};

export const statusColors: Record<DataStatus, string> = {
  approved: '#2ED573',
  pending: '#00E5FF',
  delayed: '#FFD166',
  recollect: '#FF6B35',
};

export const riskLabels: Record<RiskLevel, string> = {
  safe: '安全',
  warning: '警告',
  danger: '风险',
};

export const statusLabels: Record<DataStatus, string> = {
  approved: '已通过',
  pending: '待确认',
  delayed: '暂缓',
  recollect: '重采',
};

export const waterQualityLabels: Record<keyof import('@/types').WaterQuality, string> = {
  temperature: '水温 (°C)',
  salinity: '盐度 (‰)',
  ph: 'pH 值',
  dissolvedOxygen: '溶解氧 (mg/L)',
  turbidity: '浊度 (NTU)',
};

export function getHeatmapColor(value: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(255 * ratio);
  const g = Math.round(255 * (1 - Math.abs(ratio - 0.5) * 2));
  const b = Math.round(255 * (1 - ratio));
  return `rgb(${r}, ${g}, ${b})`;
}
