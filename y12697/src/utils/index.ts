import type { ConversionItem, Coordinates, Dimensions } from '../../shared/types';

const UNIT_FACTORS: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  inch: 0.0254,
  ft: 0.3048,
};

export function convertUnit(value: number, fromUnit: string, toUnit: string): ConversionItem | null {
  const from = UNIT_FACTORS[fromUnit];
  const to = UNIT_FACTORS[toUnit];
  if (!from || !to) return null;
  const converted = (value * from) / to;
  return {
    fromUnit,
    toUnit,
    value,
    converted: Number(converted.toFixed(6)),
    formula: `${value}${fromUnit} × ${from} / ${to} ≈ ${converted.toFixed(3)}${toUnit}`,
  };
}

export function unitList(): string[] {
  return Object.keys(UNIT_FACTORS);
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: '待复核',
    reviewing: '复核中',
    approved: '已通过',
    rejected: '已驳回',
  };
  return map[s] || s;
}

export function statusClass(s: string): string {
  const map: Record<string, string> = {
    pending: 'bg-charcoal-700 text-charcoal-200',
    reviewing: 'bg-alert-blue/20 text-alert-blue',
    approved: 'bg-alert-green/20 text-alert-green',
    rejected: 'bg-alert-red/20 text-alert-red',
  };
  return map[s] || '';
}

export function riskLabel(r: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  return map[r] || r;
}

export function riskClass(r: string): string {
  const map: Record<string, string> = {
    low: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    medium: 'bg-amber-900/40 text-amber-300 border-amber-700',
    high: 'bg-orange-900/40 text-orange-300 border-orange-700',
    critical: 'bg-red-900/40 text-red-300 border-red-700',
  };
  return map[r] || '';
}

export function computeDerivedCoords(coords: Coordinates, dims: Dimensions): { corners: Array<{ x: number; y: number; z: number }> } {
  const { x, y, z } = coords;
  const { width: w, height: h, depth: d } = dims;
  return {
    corners: [
      { x, y, z },
      { x: x + w, y, z },
      { x: x + w, y: y + h, z },
      { x, y: y + h, z },
      { x, y, z: z + d },
      { x: x + w, y, z: z + d },
      { x: x + w, y: y + h, z: z + d },
      { x, y: y + h, z: z + d },
    ],
  };
}
