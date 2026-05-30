import type { Member } from '../types';

export interface StressColorStop {
  ratio: number;
  color: string;
}

export const DEFAULT_STRESS_COLORS: StressColorStop[] = [
  { ratio: 0.0, color: '#165DFF' },
  { ratio: 0.3, color: '#165DFF' },
  { ratio: 0.3, color: '#00B42A' },
  { ratio: 0.6, color: '#00B42A' },
  { ratio: 0.6, color: '#FF7D00' },
  { ratio: 0.9, color: '#FF7D00' },
  { ratio: 0.9, color: '#F53F3F' },
  { ratio: 1.0, color: '#F53F3F' },
  { ratio: 1.0, color: '#D9001B' },
  { ratio: 1.2, color: '#D9001B' },
];

export function interpolateColor(
  stressRatio: number,
  colorStops: StressColorStop[] = DEFAULT_STRESS_COLORS
): string {
  const clampedRatio = Math.max(0, Math.min(stressRatio, 1.2));

  for (let i = 0; i < colorStops.length - 1; i++) {
    const stop1 = colorStops[i];
    const stop2 = colorStops[i + 1];

    if (clampedRatio >= stop1.ratio && clampedRatio <= stop2.ratio) {
      const t = (clampedRatio - stop1.ratio) / (stop2.ratio - stop1.ratio);
      return lerpColor(stop1.color, stop2.color, t);
    }
  }

  return colorStops[colorStops.length - 1].color;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function getStressRatio(
  stress: number,
  yieldStrength: number
): number {
  const yieldStressPa = yieldStrength * 1e6;
  return stress / yieldStressPa;
}

export function getMemberColor(
  member: Member,
  stress: number,
  showStress: boolean = true
): string {
  if (!showStress) {
    const materialColors: Record<string, string> = {
      steel: '#6B7280',
      aluminum: '#9CA3AF',
      wood: '#B45309',
    };
    return materialColors[member.material] || '#6B7280';
  }

  const ratio = getStressRatio(stress, member.yieldStrength);
  return interpolateColor(ratio);
}

export function getStressLevel(ratio: number): string {
  if (ratio < 0.3) return '安全';
  if (ratio < 0.6) return '良好';
  if (ratio < 0.9) return '警告';
  if (ratio < 1.0) return '危险';
  return '过载';
}

export function getStressLevelColor(ratio: number): string {
  if (ratio < 0.3) return '#165DFF';
  if (ratio < 0.6) return '#00B42A';
  if (ratio < 0.9) return '#FF7D00';
  if (ratio < 1.0) return '#F53F3F';
  return '#D9001B';
}

export function generateLegendItems(): Array<{
  label: string;
  color: string;
  minRatio: number;
  maxRatio: number;
}> {
  return [
    { label: '安全 (<30%)', color: '#165DFF', minRatio: 0, maxRatio: 0.3 },
    { label: '良好 (30-60%)', color: '#00B42A', minRatio: 0.3, maxRatio: 0.6 },
    { label: '警告 (60-90%)', color: '#FF7D00', minRatio: 0.6, maxRatio: 0.9 },
    { label: '危险 (90-100%)', color: '#F53F3F', minRatio: 0.9, maxRatio: 1.0 },
    { label: '过载 (>100%)', color: '#D9001B', minRatio: 1.0, maxRatio: 1.2 },
  ];
}
