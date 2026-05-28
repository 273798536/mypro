export type AreaUnit = 'mm²' | 'cm²' | 'm²';
export type ForceUnit = 'N' | 'kN' | 'kgf';
export type LengthUnit = 'mm' | 'cm' | 'm';
export type PressureUnit = 'Pa' | 'kPa' | 'MPa';
export type EnergyUnit = 'J' | 'kJ';

export type ErrorCode =
  | 'AREA_NEGATIVE'
  | 'AREA_ZERO'
  | 'AREA_UNIT_MISMATCH'
  | 'FORCE_NEGATIVE'
  | 'FORCE_ZERO'
  | 'STROKE_NEGATIVE'
  | 'STROKE_ZERO'
  | 'EFFICIENCY_TOO_HIGH'
  | 'EFFICIENCY_TOO_LOW'
  | 'RATIO_TOO_LARGE'
  | 'RATIO_TOO_SMALL';

export interface ValidationError {
  field: string;
  code: ErrorCode;
  message: string;
  suggestion: string;
  severity: 'warning' | 'error';
}

export interface CalculationInput {
  smallPistonArea: number;
  smallPistonAreaUnit: AreaUnit;
  largePistonArea: number;
  largePistonAreaUnit: AreaUnit;
  inputForce: number;
  inputForceUnit: ForceUnit;
  inputStroke: number;
  inputStrokeUnit: LengthUnit;
  efficiency: number;
  source: string;
}

export interface CalculationResult {
  pressure: number;
  pressureUnit: PressureUnit;
  outputForce: number;
  outputForceUnit: ForceUnit;
  amplificationRatio: number;
  outputStroke: number;
  outputStrokeUnit: LengthUnit;
  strokeRatio: number;
  inputWork: number;
  inputWorkUnit: EnergyUnit;
  outputWork: number;
  outputWorkUnit: EnergyUnit;
  energyLoss: number;
  energyLossUnit: EnergyUnit;
  isValid: boolean;
}

export interface Correction {
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  input: CalculationInput;
  result: CalculationResult;
  errors: ValidationError[];
  corrections: Correction[];
}

export const AREA_UNIT_FACTORS: Record<AreaUnit, number> = {
  'mm²': 1e-6,
  'cm²': 1e-4,
  'm²': 1,
};

export const FORCE_UNIT_FACTORS: Record<ForceUnit, number> = {
  'N': 1,
  'kN': 1000,
  'kgf': 9.80665,
};

export const LENGTH_UNIT_FACTORS: Record<LengthUnit, number> = {
  'mm': 0.001,
  'cm': 0.01,
  'm': 1,
};
