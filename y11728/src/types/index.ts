export type SlopeUnit = 'percent' | 'degree';
export type WindDirection = 'head' | 'tail' | 'cross';
export type DataSource = 'manual' | 'import' | 'sample';

export interface RideInput {
  id: string;
  timestamp: number;
  source: DataSource;
  sourceNote?: string;
  
  chainringTeeth: number;
  cogTeeth: number;
  cadence: number;
  riderWeight: number;
  bikeWeight: number;
  slope: number;
  slopeUnit: SlopeUnit;
  windSpeed: number;
  windDirection: WindDirection;
  temperature?: number;
  elevation?: number;
  
  segmentName?: string;
  duration?: number;
  notes?: string;
}

export interface RideResult {
  inputId: string;
  calculatedAt: number;
  
  gearRatio: number;
  speed: number;
  power: number;
  powerPerKg: number;
  powerZone: number;
  calories: number;
  distance?: number;
  
  rollingResistance: number;
  gravityResistance: number;
  aerodynamicDrag: number;
}

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning';
  field: keyof RideInput | 'general';
  code: string;
  message: string;
  suggestion: string;
  autoFix?: Partial<RideInput>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface HistoryVersion {
  version: number;
  timestamp: number;
  changes: Partial<RideInput>;
  previousValues: Partial<RideInput>;
  note?: string;
}

export interface HistoryRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  input: RideInput;
  result: RideResult;
  validation: ValidationResult;
  versions: HistoryVersion[];
  ftp?: number;
}

export interface PowerZone {
  zone: number;
  name: string;
  min: number;
  max: number;
  color: string;
}

export const POWER_ZONES: PowerZone[] = [
  { zone: 1, name: '主动恢复', min: 0, max: 0.55, color: '#52C41A' },
  { zone: 2, name: '耐力', min: 0.55, max: 0.75, color: '#165DFF' },
  { zone: 3, name: 'Tempo', min: 0.75, max: 0.90, color: '#FAAD14' },
  { zone: 4, name: '乳酸阈值', min: 0.90, max: 1.05, color: '#FF7A45' },
  { zone: 5, name: 'VO2Max', min: 1.05, max: 1.20, color: '#F5222D' },
  { zone: 6, name: '无氧能力', min: 1.20, max: 1.50, color: '#EB2F96' },
  { zone: 7, name: '神经肌肉', min: 1.50, max: Infinity, color: '#722ED1' },
];

export interface PhysicsConstants {
  gravity: number;
  rollingResistanceCoeff: number;
  dragCoeffArea: number;
  airDensity: number;
  drivetrainEfficiency: number;
  wheelCircumference: number;
}

export const DEFAULT_PHYSICS: PhysicsConstants = {
  gravity: 9.80665,
  rollingResistanceCoeff: 0.005,
  dragCoeffArea: 0.32,
  airDensity: 1.225,
  drivetrainEfficiency: 0.95,
  wheelCircumference: 2.105,
};

export type ExportFormat = 'pdf' | 'csv' | 'png';
