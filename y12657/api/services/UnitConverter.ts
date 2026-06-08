import type { BaseUnit } from '../../shared/types.js';

const UNIT_TO_MM: Record<BaseUnit, number> = {
  m: 1000,
  cm: 10,
  mm: 1,
};

export const UnitConverter = {
  toMM(value: number, unit: BaseUnit): number {
    return value * UNIT_TO_MM[unit];
  },

  fromMM(mm: number, unit: BaseUnit): number {
    return mm / UNIT_TO_MM[unit];
  },

  convert(value: number, fromUnit: BaseUnit, toUnit: BaseUnit): number {
    if (fromUnit === toUnit) return value;
    const mm = this.toMM(value, fromUnit);
    return this.fromMM(mm, toUnit);
  },
};
