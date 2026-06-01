import { TimeUnit, UNIT_CONVERSIONS } from '../types';

export function convertTime(value: number, fromUnit: TimeUnit, toUnit: TimeUnit): number {
  const fromFactor = UNIT_CONVERSIONS.find(u => u.unit === fromUnit)?.toSeconds || 1;
  const toFactor = UNIT_CONVERSIONS.find(u => u.unit === toUnit)?.toSeconds || 1;
  return (value * fromFactor) / toFactor;
}

export function convertToSeconds(value: number, unit: TimeUnit): number {
  return convertTime(value, unit, 's');
}

export function convertFromSeconds(value: number, unit: TimeUnit): number {
  return convertTime(value, 's', unit);
}

export function getUnitLabel(unit: TimeUnit): string {
  return UNIT_CONVERSIONS.find(u => u.unit === unit)?.label || unit;
}

export function getUnitShortLabel(unit: TimeUnit): string {
  const labels: Record<TimeUnit, string> = {
    s: 's',
    min: 'min',
    h: 'h',
    d: 'd'
  };
  return labels[unit];
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.0001 || Math.abs(value) >= 10000) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

export function formatTimeWithUnit(value: number, unit: TimeUnit, decimals: number = 4): string {
  return `${formatNumber(value, decimals)} ${getUnitShortLabel(unit)}`;
}
