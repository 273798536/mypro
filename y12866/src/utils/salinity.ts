import type { SalinityUnit } from '@/types';

const SALINITY_THRESHOLD_PSU = 30;

export function convertToPSU(value: number, fromUnit: SalinityUnit): number {
  switch (fromUnit) {
    case 'PSU':
      return value;
    case 'ppt':
      return value - 0.3;
    case 'permil':
      return value - 0.3;
    case 'percent':
      return value * 10 - 0.3;
    case 'unknown':
      return value;
    default:
      return value;
  }
}

export function checkSalinityCompliance(value: number, unit: SalinityUnit, threshold: number = SALINITY_THRESHOLD_PSU): {
  compliant: boolean;
  psuValue: number;
  threshold: number;
  delta: number;
} {
  const psuValue = convertToPSU(value, unit);
  return {
    compliant: psuValue <= threshold,
    psuValue: Math.round(psuValue * 100) / 100,
    threshold,
    delta: Math.round((psuValue - threshold) * 100) / 100,
  };
}

export function getUnitLabel(unit: SalinityUnit): string {
  switch (unit) {
    case 'PSU': return 'PSU';
    case 'ppt': return 'ppt';
    case 'permil': return '‰';
    case 'percent': return '%';
    case 'unknown': return '（无单位）';
    default: return unit;
  }
}

export function detectSalinityUnitMix(records: { salinity: number; salinityUnit: SalinityUnit }[]): boolean {
  const units = new Set(records.map(r => r.salinityUnit).filter(u => u !== 'unknown'));
  return units.size > 1;
}
