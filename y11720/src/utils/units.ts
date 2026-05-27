import { CONVERSION_FACTORS, UNIT_LABELS } from './constants';
import type { DiameterUnit, FlowRateUnit, LengthUnit, RoughnessUnit } from '../types';

export function convertDiameter(value: number, fromUnit: DiameterUnit, toUnit: DiameterUnit = 'm'): number {
  const inMeters = value * CONVERSION_FACTORS.diameter[fromUnit];
  return inMeters / CONVERSION_FACTORS.diameter[toUnit];
}

export function convertFlowRate(value: number, fromUnit: FlowRateUnit, toUnit: FlowRateUnit = 'm3_s'): number {
  const inCubicMetersPerSecond = value * CONVERSION_FACTORS.flowRate[fromUnit];
  return inCubicMetersPerSecond / CONVERSION_FACTORS.flowRate[toUnit];
}

export function convertLength(value: number, fromUnit: LengthUnit, toUnit: LengthUnit = 'm'): number {
  const inMeters = value * CONVERSION_FACTORS.length[fromUnit];
  return inMeters / CONVERSION_FACTORS.length[toUnit];
}

export function convertRoughness(value: number, fromUnit: RoughnessUnit, toUnit: RoughnessUnit = 'm'): number {
  const inMeters = value * CONVERSION_FACTORS.roughness[fromUnit];
  return inMeters / CONVERSION_FACTORS.roughness[toUnit];
}

export function pascalToKPa(value: number): number {
  return value / 1000;
}

export function pascalToBar(value: number): number {
  return value / 100000;
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && value !== 0)) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
}

export function formatPressure(value: number): string {
  if (value >= 100000) {
    return `${formatNumber(pascalToBar(value), 4)} bar`;
  }
  if (value >= 1000) {
    return `${formatNumber(pascalToKPa(value), 4)} kPa`;
  }
  return `${formatNumber(value, 2)} Pa`;
}

export function getUnitOptions(
  category: 'diameter' | 'flowRate' | 'length' | 'roughness'
): { value: string; label: string }[] {
  return Object.entries(UNIT_LABELS[category]).map(([value, label]) => ({
    value,
    label,
  }));
}
