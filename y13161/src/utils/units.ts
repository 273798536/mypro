import { UnitConversionRule } from '@/types';

export const UNIT_CATEGORIES: { [key: string]: string } = {
  WAVE_HEIGHT: 'wave_height',
  WAVE_SPEED: 'wave_speed',
  TEMPERATURE: 'temperature',
};

export const unitConversionRules: UnitConversionRule[] = [
  {
    category: UNIT_CATEGORIES.WAVE_HEIGHT,
    baseUnit: 'm',
    units: {
      m: {
        symbol: 'm',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      km: {
        symbol: 'km',
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      cm: {
        symbol: 'cm',
        toBase: (v) => v / 100,
        fromBase: (v) => v * 100,
      },
      mm: {
        symbol: 'mm',
        toBase: (v) => v / 1000,
        fromBase: (v) => v * 1000,
      },
      ft: {
        symbol: 'ft',
        toBase: (v) => v * 0.3048,
        fromBase: (v) => v / 0.3048,
      },
    },
  },
  {
    category: UNIT_CATEGORIES.WAVE_SPEED,
    baseUnit: 'm/s',
    units: {
      'm/s': {
        symbol: 'm/s',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      'km/h': {
        symbol: 'km/h',
        toBase: (v) => v / 3.6,
        fromBase: (v) => v * 3.6,
      },
      'km/s': {
        symbol: 'km/s',
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      knot: {
        symbol: 'knot',
        toBase: (v) => v * 0.514444,
        fromBase: (v) => v / 0.514444,
      },
      mph: {
        symbol: 'mph',
        toBase: (v) => v * 0.44704,
        fromBase: (v) => v / 0.44704,
      },
    },
  },
  {
    category: UNIT_CATEGORIES.TEMPERATURE,
    baseUnit: 'C',
    units: {
      C: {
        symbol: 'C',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      F: {
        symbol: 'F',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
      },
      K: {
        symbol: 'K',
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15,
      },
    },
  },
];

export function getUnitRule(category: string): UnitConversionRule | undefined {
  return unitConversionRules.find((rule) => rule.category === category);
}

export function parseUnitFromString(text: string): string | null {
  const unitPatterns: { [key: string]: RegExp } = {
    'm/s': /\b(m\/s|meters?\/s|meters? per second)\b/i,
    'km/h': /\b(km\/h|kmh|kilometers? per hour)\b/i,
    'km/s': /\b(km\/s|kilometers? per second)\b/i,
    km: /\b(km|kilometer|kilometers)\b/i,
    cm: /\b(cm|centimeter|centimeters)\b/i,
    mm: /\b(mm|millimeter|millimeters)\b/i,
    ft: /\b(ft|foot|feet)\b/i,
    m: /\b(m|meter|meters)\b/i,
    knot: /\b(knot|knots|kt)\b/i,
    mph: /\b(mph|miles per hour)\b/i,
    C: /\b(C|celsius|degrees? C)\b/i,
    F: /\b(F|fahrenheit|degrees? F)\b/i,
    K: /\b(K|kelvin)\b/i,
  };

  for (const [unit, pattern] of Object.entries(unitPatterns)) {
    if (pattern.test(text)) {
      return unit;
    }
  }
  return null;
}

export function parseValueAndUnit(text: string): { value: number; unit: string | null } {
  const match = text.match(/(-?\d+\.?\d*)\s*([a-zA-Z/°]*)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2] ? parseUnitFromString(match[2]) : null;
    return { value, unit };
  }
  return { value: NaN, unit: null };
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: string
): { value: number; factor: number } | null {
  const rule = getUnitRule(category);
  if (!rule) return null;

  const fromConverter = rule.units[fromUnit];
  const toConverter = rule.units[toUnit];

  if (!fromConverter || !toConverter) return null;

  const baseValue = fromConverter.toBase(value);
  const convertedValue = toConverter.fromBase(baseValue);
  const factor = convertedValue / value;

  return { value: convertedValue, factor };
}

export function detectUnitMismatch(
  values: Array<{ value: number; unit: string; timestamp: Date }>,
  category: string
): Array<{
  index: number;
  expectedUnit: string;
  actualUnit: string;
  valueBefore: number;
  valueAfter: number;
  conversionFactor: number;
  severity: 'warning' | 'critical';
}> {
  if (values.length === 0) return [];

  const unitCounts: { [key: string]: number } = {};
  values.forEach((v) => {
    unitCounts[v.unit] = (unitCounts[v.unit] || 0) + 1;
  });

  const expectedUnit = Object.entries(unitCounts).sort((a, b) => b[1] - a[1])[0][0];

  const results: Array<{
    index: number;
    expectedUnit: string;
    actualUnit: string;
    valueBefore: number;
    valueAfter: number;
    conversionFactor: number;
    severity: 'warning' | 'critical';
  }> = [];

  const rule = getUnitRule(category);
  if (!rule) return [];

  values.forEach((v, index) => {
    if (v.unit !== expectedUnit && rule.units[v.unit]) {
      const conversion = convertUnit(v.value, v.unit, expectedUnit, category);
      if (conversion) {
        const factor = Math.abs(conversion.factor);
        const severity: 'warning' | 'critical' = factor >= 10 || factor <= 0.1 ? 'critical' : 'warning';

        results.push({
          index,
          expectedUnit,
          actualUnit: v.unit,
          valueBefore: v.value,
          valueAfter: conversion.value,
          conversionFactor: conversion.factor,
          severity,
        });
      }
    }
  });

  return results;
}

export function getStandardUnit(category: string): string {
  const rule = getUnitRule(category);
  return rule?.baseUnit || '';
}

export function getAllUnitsForCategory(category: string): string[] {
  const rule = getUnitRule(category);
  return rule ? Object.keys(rule.units) : [];
}
