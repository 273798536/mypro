import type { RiskLevel } from '../types/asset';

export const COLORS = {
  background: '#0A0E1A',
  surface: 'rgba(15, 23, 42, 0.85)',
  border: 'rgba(148, 163, 184, 0.2)',
  
  risk: {
    low: {
      start: '#00D4AA',
      end: '#0099FF',
      glow: 'rgba(0, 212, 170, 0.6)',
    },
    medium: {
      start: '#FFD700',
      end: '#FF8C00',
      glow: 'rgba(255, 215, 0, 0.6)',
    },
    high: {
      start: '#FF6B35',
      end: '#DC143C',
      glow: 'rgba(255, 107, 53, 0.8)',
    },
  },
  
  change: {
    up: '#00D4AA',
    down: '#DC143C',
    marker: '#9D4EDD',
    markerGlow: 'rgba(157, 78, 221, 0.8)',
  },
  
  category: {
    ready: '#00D4AA',
    needReview: '#FFD700',
    filterFailed: '#DC143C',
  },
  
  axes: '#64748B',
  grid: 'rgba(100, 116, 139, 0.2)',
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
  },
} as const;

export function getRiskColor(level: RiskLevel): string {
  const colors = COLORS.risk[level];
  return colors.start;
}

export function getRiskGradient(level: RiskLevel): [string, string] {
  const colors = COLORS.risk[level];
  return [colors.start, colors.end];
}

export function lerpColor(color1: string, color2: string, t: number): string {
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

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getValueBasedColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  if (normalized < 0.33) {
    return lerpColor(COLORS.risk.low.start, COLORS.risk.low.end, normalized / 0.33);
  } else if (normalized < 0.66) {
    return lerpColor(COLORS.risk.medium.start, COLORS.risk.medium.end, (normalized - 0.33) / 0.33);
  } else {
    return lerpColor(COLORS.risk.high.start, COLORS.risk.high.end, (normalized - 0.66) / 0.34);
  }
}
