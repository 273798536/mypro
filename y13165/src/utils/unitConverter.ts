import type { UnitConversion } from '@/types';

interface UnitDef {
  names: string[];
  factor: number;
  displayName: string;
}

const TORQUE_UNITS: UnitDef[] = [
  {
    names: ['N·m', 'N*m', 'Nm', 'N m', '牛米', '牛顿米', '牛·米', '牛＊米'],
    factor: 1,
    displayName: 'N·m',
  },
  {
    names: ['kN·m', 'kN*m', 'kNm', '千牛米', '千牛·米'],
    factor: 1000,
    displayName: 'kN·m',
  },
  {
    names: ['mN·m', 'mN*m', 'mNm', '毫牛米'],
    factor: 0.001,
    displayName: 'mN·m',
  },
  {
    names: ['kgf·m', 'kgf*m', 'kgfm', 'kgf m', '公斤米', '千克力米', 'kg·m', 'kgm'],
    factor: 9.80665,
    displayName: 'kgf·m',
  },
  {
    names: ['kgf·cm', 'kgf*cm', 'kgfcm', '公斤厘米'],
    factor: 0.0980665,
    displayName: 'kgf·cm',
  },
  {
    names: ['lbf·ft', 'lbf*ft', 'lb-ft', 'lbft', 'lb ft', '磅英尺', '磅尺'],
    factor: 1.355818,
    displayName: 'lbf·ft',
  },
  {
    names: ['lbf·in', 'lbf*in', 'lb-in', 'lbin', '磅英寸'],
    factor: 0.112985,
    displayName: 'lbf·in',
  },
  {
    names: ['ozf·in', 'ozf*in', 'oz-in', '盎司英寸'],
    factor: 0.0070616,
    displayName: 'ozf·in',
  },
  {
    names: ['dyn·m', 'dyn*m', '达因米'],
    factor: 0.00001,
    displayName: 'dyn·m',
  },
];

function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·*＊]/g, '*')
    .replace(/[—–]/g, '-')
    .trim();
}

export function detectTorqueUnit(unitStr: string): UnitDef | null {
  if (!unitStr || unitStr.trim() === '') return null;

  const normalized = normalizeString(unitStr);

  for (const unit of TORQUE_UNITS) {
    for (const name of unit.names) {
      if (normalizeString(name) === normalized) {
        return unit;
      }
    }
  }

  for (const unit of TORQUE_UNITS) {
    for (const name of unit.names) {
      if (normalizeString(name).includes(normalized) || normalized.includes(normalizeString(name))) {
        return unit;
      }
    }
  }

  return null;
}

export function convertToNm(value: number, unitStr: string): { value: number; conversion: UnitConversion } {
  const unit = detectTorqueUnit(unitStr);

  if (!unit) {
    return {
      value,
      conversion: {
        fromUnit: unitStr,
        toUnit: 'N·m',
        factor: 1,
        detected: false,
        displayName: unitStr || '未识别',
      },
    };
  }

  return {
    value: value * unit.factor,
    conversion: {
      fromUnit: unit.displayName,
      toUnit: 'N·m',
      factor: unit.factor,
      detected: true,
      displayName: unit.displayName,
    },
  };
}

export function detectOrderOfMagnitude(values: number[]): number {
  if (values.length === 0) return 0;
  const absValues = values.map(v => Math.abs(v)).filter(v => v > 0);
  if (absValues.length === 0) return 0;
  const logValues = absValues.map(v => Math.log10(v));
  const avgLog = logValues.reduce((a, b) => a + b, 0) / logValues.length;
  return Math.round(avgLog);
}

export function checkOrderOfMagnitudeAnomaly(value: number, baselineMagnitude: number): boolean {
  if (value === 0) return false;
  const valueMagnitude = Math.floor(Math.log10(Math.abs(value)));
  return Math.abs(valueMagnitude - baselineMagnitude) >= 2;
}

export function formatTorque(value: number, decimals: number = 2): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(decimals) + ' kN·m';
  }
  if (Math.abs(value) < 0.01 && value !== 0) {
    return (value * 1000).toFixed(decimals) + ' mN·m';
  }
  return value.toFixed(decimals) + ' N·m';
}

export const ALL_UNIT_DISPLAY_NAMES = TORQUE_UNITS.map(u => u.displayName);
