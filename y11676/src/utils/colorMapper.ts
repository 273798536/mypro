import { RISK_COLORS, ANOMALY_COLORS, RiskLevel } from '../types';

export function riskToColor(riskLevel: RiskLevel): string {
  return RISK_COLORS[riskLevel] || '#888888';
}

export function riskToGlowColor(riskLevel: RiskLevel): string {
  const colors: Record<number, string> = {
    1: 'rgba(16, 185, 129, 0.6)',
    2: 'rgba(52, 211, 153, 0.6)',
    3: 'rgba(251, 191, 36, 0.6)',
    4: 'rgba(249, 115, 22, 0.6)',
    5: 'rgba(239, 68, 68, 0.8)',
  };
  return colors[riskLevel] || 'rgba(136, 136, 136, 0.6)';
}

export function anomalyToColor(type: string): string {
  return ANOMALY_COLORS[type as keyof typeof ANOMALY_COLORS] || '#888888';
}

export function amountToHeight(amount: number, maxAbs: number): number {
  if (maxAbs === 0) return 0;
  return Math.min(Math.abs(amount) / maxAbs, 1) * 8;
}

export function colorToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function getGradientColor(ratio: number): string {
  const colors = ['#10b981', '#34d399', '#fbbf24', '#f97316', '#ef4444'];
  const index = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
  return colors[index];
}
