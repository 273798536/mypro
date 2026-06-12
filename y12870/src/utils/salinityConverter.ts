import type { SalinityUnit, SalinityRecord, ImportValidationError } from '@/types';

const CONDUCTIVITY_PSU_25C: Record<number, number> = {
  42914: 35, 40000: 32.4, 37000: 29.8, 34000: 27.2,
  31000: 24.5, 28000: 21.8, 25000: 19.1, 49500: 33.5,
};

export function convertSalinity(value: number, from: SalinityUnit, to: SalinityUnit = 'PSU'): number {
  let psuValue: number;
  switch (from) {
    case 'PSU': psuValue = value; break;
    case '‰': psuValue = value * 1.0000; break;
    case 'ppt': psuValue = value / 1.0043; break;
    case 'mS/cm': {
      const keys = Object.keys(CONDUCTIVITY_PSU_25C).map(Number).sort((a, b) => a - b);
      let lower = keys[0], upper = keys[keys.length - 1];
      for (let i = 0; i < keys.length - 1; i++) {
        if (value >= keys[i] && value <= keys[i + 1]) { lower = keys[i]; upper = keys[i + 1]; break; }
      }
      const t = (value - lower) / (upper - lower);
      psuValue = CONDUCTIVITY_PSU_25C[lower] + t * (CONDUCTIVITY_PSU_25C[upper] - CONDUCTIVITY_PSU_25C[lower]);
      break;
    }
    default: psuValue = value;
  }
  switch (to) {
    case 'PSU': return +psuValue.toFixed(2);
    case '‰': return +psuValue.toFixed(2);
    case 'ppt': return +(psuValue * 1.0043).toFixed(2);
    case 'mS/cm': {
      const entries = Object.entries(CONDUCTIVITY_PSU_25C).sort((a, b) => a[1] - b[1]);
      let lo = entries[0], hi = entries[entries.length - 1];
      for (let i = 0; i < entries.length - 1; i++) {
        if (psuValue >= entries[i][1] && psuValue <= entries[i + 1][1]) { lo = entries[i]; hi = entries[i + 1]; break; }
      }
      const t = (psuValue - lo[1]) / (hi[1] - lo[1]);
      return Math.round(Number(lo[0]) + t * (Number(hi[0]) - Number(lo[0])));
    }
    default: return +psuValue.toFixed(2);
  }
}

export function detectDominantUnit(records: SalinityRecord[]): SalinityUnit {
  const counts: Record<string, number> = {};
  records.forEach(r => { counts[r.unit] = (counts[r.unit] || 0) + 1; });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] as SalinityUnit) || 'PSU';
}

export function markUnitMismatches(records: SalinityRecord[]): SalinityRecord[] {
  const dominant = detectDominantUnit(records);
  return records.map(r => ({
    ...r,
    unitMismatch: r.unit !== dominant,
    normalizedValue: r.unit !== dominant ? convertSalinity(r.value, r.unit, 'PSU') : r.value,
  }));
}

export function normalizeAllToPSU(records: SalinityRecord[]): SalinityRecord[] {
  return records.map(r => ({
    ...r,
    normalizedValue: convertSalinity(r.value, r.unit, 'PSU'),
    unitMismatch: false,
  }));
}

export function getUnitExplanation(from: SalinityUnit, to: SalinityUnit): string {
  if (from === to) return '单位已统一';
  if (from === 'mS/cm') return `电导率查表插值 → ${to}（25℃基准）`;
  const factor = to === 'ppt' ? '×1.0043' : to === '‰' ? '≈' : '÷1.0043';
  return `${from} ${factor} → ${to}`;
}
