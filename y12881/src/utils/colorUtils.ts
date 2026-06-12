import { RiskLevel, WaterLayer, SampleStatus } from '@/types';

export const SPECIES_COLORS: Record<string, string> = {
  '夜光藻': '#FF6B9D',
  '中华哲水蚤': '#00D4AA',
  '小型拟哲水蚤': '#5AD8FF',
  '强壮箭虫': '#FFD166',
  '长尾类幼体': '#C084FC',
  '短尾类溞状幼体': '#FB923C',
  '海洋原甲藻': '#34D399',
  '尖刺伪菱形藻': '#F472B6',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  none: '#8EA6BA',
  low: '#00D4AA',
  medium: '#FF9F1C',
  high: '#E63946',
};

export const LAYER_COLORS: Record<WaterLayer, string> = {
  surface: '#2E8FB4',
  middle: '#154E69',
  deep: '#0F2F44',
};

export const STATUS_COLORS: Record<SampleStatus, string> = {
  pending: '#FF9F1C',
  reviewed: '#5AADCB',
  confirmed: '#00D4AA',
};

export function getSpeciesColor(species: string): string {
  return SPECIES_COLORS[species] || '#00D4AA';
}

export function getRiskColor(level: RiskLevel): string {
  return RISK_COLORS[level];
}

export function getLayerColor(layer: WaterLayer): string {
  return LAYER_COLORS[layer];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0.83, b: 0.67 };
}

export function getCountSize(count: number): number {
  const normalized = Math.min(Math.log10(count + 1) / 3, 1);
  return 0.08 + normalized * 0.22;
}

export function formatCoords(x: number, y: number, z: number): string {
  return `X:${x.toFixed(1)} Y:${y.toFixed(1)} Z:${z.toFixed(1)}`;
}
