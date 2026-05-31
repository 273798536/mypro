import * as THREE from 'three';

export const HEATMAP_COLORS = {
  low: '#1e40af',
  mediumLow: '#0d9488',
  medium: '#eab308',
  mediumHigh: '#f97316',
  high: '#dc2626',
};

export function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function interpolateColor(
  value: number,
  thresholds: [number, number, number, number],
  colors = HEATMAP_COLORS
): THREE.Color {
  const [t1, t2, t3, t4] = thresholds;

  if (value <= t1) return hexToRgb(colors.low);
  if (value <= t2) {
    const t = (value - t1) / (t2 - t1);
    return hexToRgb(colors.low).lerp(hexToRgb(colors.mediumLow), t);
  }
  if (value <= t3) {
    const t = (value - t2) / (t3 - t2);
    return hexToRgb(colors.mediumLow).lerp(hexToRgb(colors.medium), t);
  }
  if (value <= t4) {
    const t = (value - t3) / (t4 - t3);
    return hexToRgb(colors.medium).lerp(hexToRgb(colors.mediumHigh), t);
  }
  return hexToRgb(colors.high);
}

export function getLossRatioLabel(thresholds: [number, number, number, number]): string[] {
  return [
    `< ${(thresholds[0] * 100).toFixed(0)}%`,
    `${(thresholds[0] * 100).toFixed(0)}% - ${(thresholds[1] * 100).toFixed(0)}%`,
    `${(thresholds[1] * 100).toFixed(0)}% - ${(thresholds[2] * 100).toFixed(0)}%`,
    `${(thresholds[2] * 100).toFixed(0)}% - ${(thresholds[3] * 100).toFixed(0)}%`,
    `> ${(thresholds[3] * 100).toFixed(0)}%`,
  ];
}

export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function formatCurrency(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }
  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
