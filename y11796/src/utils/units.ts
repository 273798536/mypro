import { ResistanceUnit, CapacitanceUnit, VoltageUnit, TimeUnit } from '@/types';

export const RESISTANCE_FACTORS: Record<ResistanceUnit, number> = {
  'Ω': 1,
  'kΩ': 1000,
  'MΩ': 1000000,
};

export const CAPACITANCE_FACTORS: Record<CapacitanceUnit, number> = {
  'F': 1,
  'μF': 1e-6,
  'nF': 1e-9,
  'pF': 1e-12,
};

export const VOLTAGE_FACTORS: Record<VoltageUnit, number> = {
  'V': 1,
  'mV': 1e-3,
  'kV': 1000,
};

export const TIME_FACTORS: Record<TimeUnit, number> = {
  's': 1,
  'ms': 1e-3,
  'μs': 1e-6,
};

export function toOhms(value: number, unit: ResistanceUnit): number {
  return value * RESISTANCE_FACTORS[unit];
}

export function toFarads(value: number, unit: CapacitanceUnit): number {
  return value * CAPACITANCE_FACTORS[unit];
}

export function toVolts(value: number, unit: VoltageUnit): number {
  return value * VOLTAGE_FACTORS[unit];
}

export function toSeconds(value: number, unit: TimeUnit): number {
  return value * TIME_FACTORS[unit];
}

export function formatTimeConstant(tau: number): { value: number; unit: TimeUnit; display: string } {
  if (tau >= 1) {
    return { value: tau, unit: 's', display: `${tau.toFixed(4)} s` };
  } else if (tau >= 1e-3) {
    const ms = tau / 1e-3;
    return { value: ms, unit: 'ms', display: `${ms.toFixed(2)} ms` };
  } else {
    const us = tau / 1e-6;
    return { value: us, unit: 'μs', display: `${us.toFixed(2)} μs` };
  }
}

export function formatResistance(value: number, unit: ResistanceUnit): string {
  return `${value} ${unit}`;
}

export function formatCapacitance(value: number, unit: CapacitanceUnit): string {
  return `${value} ${unit}`;
}

export function formatVoltage(value: number, unit: VoltageUnit): string {
  return `${value.toFixed(2)} ${unit}`;
}

export function detectUnitMismatch(history: Array<{ field: string; unit: string }>): boolean {
  const fieldUnits = new Map<string, Set<string>>();
  for (const entry of history) {
    if (!fieldUnits.has(entry.field)) {
      fieldUnits.set(entry.field, new Set());
    }
    fieldUnits.get(entry.field)!.add(entry.unit);
  }
  for (const [, units] of fieldUnits) {
    if (units.size > 1) return true;
  }
  return false;
}
