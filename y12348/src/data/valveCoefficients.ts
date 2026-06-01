import type { ValveType } from '@/types';

export interface ValveCoefficientData {
  fullyOpenK: number;
  halfOpenK: number;
  closedK: number;
  openingCurve: (opening: number) => number;
}

export const VALVE_COEFFICIENTS: Record<ValveType, ValveCoefficientData> = {
  gate: {
    fullyOpenK: 0.17,
    halfOpenK: 20,
    closedK: 10000,
    openingCurve: (opening: number) => {
      if (opening >= 100) return 0.17;
      if (opening <= 0) return 10000;
      const normalized = opening / 100;
      return 0.17 + 45 * Math.pow(1 - normalized, 3);
    }
  },
  globe: {
    fullyOpenK: 6.3,
    halfOpenK: 80,
    closedK: 10000,
    openingCurve: (opening: number) => {
      if (opening >= 100) return 6.3;
      if (opening <= 0) return 10000;
      const normalized = opening / 100;
      return 6.3 + 120 * Math.pow(1 - normalized, 2.5);
    }
  },
  ball: {
    fullyOpenK: 0.05,
    halfOpenK: 30,
    closedK: 10000,
    openingCurve: (opening: number) => {
      if (opening >= 100) return 0.05;
      if (opening <= 0) return 10000;
      const normalized = opening / 100;
      return 0.05 + 55 * Math.pow(1 - normalized, 4);
    }
  },
  butterfly: {
    fullyOpenK: 0.25,
    halfOpenK: 15,
    closedK: 10000,
    openingCurve: (opening: number) => {
      if (opening >= 100) return 0.25;
      if (opening <= 0) return 10000;
      const normalized = opening / 100;
      return 0.25 + 35 * Math.pow(1 - normalized, 2);
    }
  },
  check: {
    fullyOpenK: 2.0,
    halfOpenK: 50,
    closedK: 10000,
    openingCurve: (opening: number) => {
      if (opening >= 100) return 2.0;
      if (opening <= 0) return 10000;
      const normalized = opening / 100;
      return 2.0 + 70 * Math.pow(1 - normalized, 3);
    }
  },
};

export const ELBOW_COEFFICIENTS: Record<number, number> = {
  45: 0.35,
  90: 0.75,
  180: 1.5,
};

export const VALVE_NAMES: Record<ValveType, string> = {
  gate: '闸阀',
  globe: '截止阀',
  ball: '球阀',
  butterfly: '蝶阀',
  check: '止回阀',
};

export const PIPE_ROUGHNESS: Record<string, number> = {
  '铜管': 0.0015,
  '新钢管': 0.05,
  '旧钢管': 0.2,
  '镀锌钢管': 0.15,
  '铸铁管': 0.26,
  'PVC管': 0.001,
  'PE管': 0.002,
  '混凝土管': 1.0,
};

export function getValveKFactor(type: ValveType, openingPercentage: number): number {
  const valve = VALVE_COEFFICIENTS[type];
  return valve.openingCurve(openingPercentage);
}

export function getElbowKFactor(angle: number): number {
  return ELBOW_COEFFICIENTS[angle] || 0.75;
}
