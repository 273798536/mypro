import { CALCULATION_PRECISION, UNITS } from './constants';

export { UNITS };

export function formatNumber(value: number | null | undefined, precision: number = CALCULATION_PRECISION): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  return value.toFixed(precision);
}

export function formatWithUnit(value: number | null | undefined, unit: string, precision?: number): string {
  const formatted = formatNumber(value, precision);
  if (formatted === '-') {
    return '-';
  }
  return `${formatted} ${unit}`;
}

export function formatThermalConductivity(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.thermalConductivity, 4);
}

export function formatThickness(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.thickness, 4);
}

export function formatArea(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.area, 2);
}

export function formatTemperature(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.temperature, 1);
}

export function formatHeatFlowDensity(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.heatFlowDensity, 2);
}

export function formatHeatFlowRate(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.heatFlowRate, 2);
}

export function formatThermalResistance(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.thermalResistance, 4);
}

export function formatUValue(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.uValue, 4);
}

export function formatEnergyMonthly(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.energyMonthly, 2);
}

export function formatPercentage(value: number | null | undefined): string {
  return formatWithUnit(value, UNITS.percentage, 1);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  return `¥${value.toFixed(2)}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
