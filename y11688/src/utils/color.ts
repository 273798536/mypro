import type { RiskLevel } from '@/types';

export const riskColors: Record<RiskLevel, string> = {
  low: '#2EC4B6',
  medium: '#FFE66D',
  high: '#FF9F1C',
  critical: '#E71D36',
};

export const riskLabels: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '极高风险',
};

export const difficultyColors: Record<string, string> = {
  beginner: '#2EC4B6',
  intermediate: '#FFE66D',
  advanced: '#FF9F1C',
  expert: '#E71D36',
};

export const difficultyLabels: Record<string, string> = {
  beginner: '初级道',
  intermediate: '中级道',
  advanced: '高级道',
  expert: '专家道',
};

export const getSlopeColorByAngle = (angle: number): string => {
  if (angle < 12) return '#2EC4B6';
  if (angle < 20) return '#FFE66D';
  if (angle < 30) return '#FF9F1C';
  return '#E71D36';
};

export const getRiskLevelByScore = (score: number): RiskLevel => {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

export const interpolateColor = (
  color1: string,
  color2: string,
  t: number
): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
};

export const getHeatmapColor = (intensity: number): string => {
  if (intensity < 0.25) return interpolateColor('#2EC4B6', '#FFE66D', intensity * 4);
  if (intensity < 0.5) return interpolateColor('#FFE66D', '#FF9F1C', (intensity - 0.25) * 4);
  if (intensity < 0.75) return interpolateColor('#FF9F1C', '#E71D36', (intensity - 0.5) * 4);
  return interpolateColor('#E71D36', '#7B2CBF', (intensity - 0.75) * 4);
};
