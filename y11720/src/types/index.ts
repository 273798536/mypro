export type DiameterUnit = 'mm' | 'm' | 'in';
export type FlowRateUnit = 'm3_h' | 'l_s' | 'm3_s';
export type LengthUnit = 'm' | 'km' | 'ft';
export type RoughnessUnit = 'mm' | 'm';
export type FlowRegime = 'laminar' | 'transitional' | 'turbulent' | 'critical';
export type WarningType = 'reynolds_critical' | 'unit_mixed' | 'valve_missing' | 'boundary';
export type WarningSeverity = 'warning' | 'error';
export type ConflictStrategy = 'skip' | 'overwrite' | 'append';

export interface FluidProperties {
  id: string;
  name: string;
  density: number;
  viscosity: number;
  temperature: number;
}

export interface ValveItem {
  id: string;
  type: string;
  count: number;
  diameter: number;
  kValue: number;
}

export interface ValveLibraryItem {
  id: string;
  type: string;
  subtype: string;
  kValue: number;
  standard: string;
  description: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  roughness: number;
  roughnessUnit: RoughnessUnit;
  description: string;
}

export interface Warning {
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  suggestion: string;
}

export interface EditRecord {
  timestamp: number;
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

export interface CalculationParams {
  id: string;
  name: string;
  diameter: number;
  diameterUnit: DiameterUnit;
  flowRate: number;
  flowRateUnit: FlowRateUnit;
  pipeLength: number;
  pipeLengthUnit: LengthUnit;
  roughness: number;
  roughnessUnit: RoughnessUnit;
  fluid: FluidProperties;
  valves: ValveItem[];
  source?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  editHistory: EditRecord[];
}

export interface CalculationResult {
  reynolds: number;
  flowRegime: FlowRegime;
  frictionFactor: number;
  velocity: number;
  headLoss: number;
  localLoss: number;
  totalPressureDrop: number;
  warnings: Warning[];
  explanation: string;
  calculationSteps: CalculationStep[];
}

export interface CalculationStep {
  name: string;
  formula: string;
  value: number;
  unit: string;
  description: string;
}

export interface Report {
  id: string;
  calcId: string;
  params: CalculationParams;
  result: CalculationResult;
  exportedAt: number;
  title: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  success: boolean;
  data: CalculationParams[];
  errors: string[];
  warnings: string[];
}

export interface CompareDataPoint {
  name: string;
  diameter: number;
  flowRate: number;
  pressureDrop: number;
  velocity: number;
  reynolds: number;
}
