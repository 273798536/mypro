export type LengthUnit = 'm' | 'mm' | 'cm';
export type SpeedUnit = 'm/s' | 'km/h' | 'ft/s';
export type DensityUnit = 'kg/m³' | 'g/cm³';
export type ViscosityUnit = 'Pa·s' | 'cP';
export type TemperatureUnit = 'K' | '°C' | '°F';

export interface Material {
  id: string;
  name: string;
  category: string;
  density: number;
  viscosity: number;
  thermalConductivity: number;
  source: string;
}

export type ValidationErrorType = 'unit_mismatch' | 'reynolds_mismatch' | 'mach_mismatch' | 'invalid_value';

export interface ValidationError {
  type: ValidationErrorType;
  severity: 'error' | 'warning';
  message: string;
  location: string;
  field: string;
}

export interface ExperimentRecord {
  id: string;
  experimentNo: string;
  date: string;
  materialId: string;
  materialSource: string;
  
  modelLength: number;
  modelLengthUnit: LengthUnit;
  realLength: number;
  realLengthUnit: LengthUnit;
  
  windSpeed: number;
  windSpeedUnit: SpeedUnit;
  airDensity: number;
  airDensityUnit: DensityUnit;
  airViscosity: number;
  airViscosityUnit: ViscosityUnit;
  temperature: number;
  temperatureUnit: TemperatureUnit;
  
  reynoldsNumber: number | null;
  machNumber: number | null;
  scaleRatio: number | null;
  
  status: 'valid' | 'error' | 'warning';
  errors: ValidationError[];
}

export interface Viewpoint {
  id: string;
  name: string;
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  createdAt: string;
}

export interface FilterState {
  experimentNo: string;
  materialType: string;
  dateRange: [string, string] | null;
  status: 'all' | 'valid' | 'error' | 'warning';
}

export interface CriterionNode {
  id: string;
  name: string;
  symbol: string;
  description: string;
  formula: string;
  value: number;
  position: [number, number, number];
  color: string;
  relatedRecordIds: string[];
  hasError?: boolean;
}

export interface ScaleFormData {
  modelLength: number;
  modelLengthUnit: LengthUnit;
  realLength: number;
  realLengthUnit: LengthUnit;
  windSpeed: number;
  windSpeedUnit: SpeedUnit;
  airDensity: number;
  airDensityUnit: DensityUnit;
  airViscosity: number;
  airViscosityUnit: ViscosityUnit;
  temperature: number;
  temperatureUnit: TemperatureUnit;
}
