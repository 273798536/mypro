export type LengthUnit = 'm' | 'cm' | 'mm';
export type MassUnit = 'kg' | 'g';
export type TimeUnit = 's' | 'ms';
export type AngularVelocityUnit = 'rad/s' | 'rpm' | 'deg/s';

export interface DiskParams {
  radius: number;
  radiusUnit: LengthUnit;
  mass: number;
  massUnit: MassUnit;
}

export interface HangingMass {
  mass: number;
  massUnit: MassUnit;
  stringRadius: number;
  stringRadiusUnit: LengthUnit;
}

export interface DataPoint {
  index: number;
  time: number;
  timeUnit: TimeUnit;
  angularVelocity: number;
  angularVelocityUnit: AngularVelocityUnit;
  isValid: boolean;
}

export type AnomalyType = 'unit_error' | 'data_reversed' | 'friction_missing' | 'outlier' | 'empty_data';
export type AnomalySeverity = 'error' | 'warning' | 'info';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  suggestion: string;
  field?: string;
  relatedValue?: unknown;
  resolved: boolean;
}

export type ActionType = 'input' | 'correction' | 'unit_change' | 'calculation' | 'auto_fix';
export type SourceType = 'user' | 'auto_correction' | 'system';

export interface HistoryRecord {
  id: string;
  actionType: ActionType;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  source: SourceType;
  timestamp: Date;
  description: string;
}

export interface CalculationResult {
  momentOfInertia: number;
  momentOfInertiaUncorrected: number;
  frictionCoefficient: number;
  angularAcceleration: number;
  frictionTorque: number;
  angularDeceleration?: number;
  theoreticalValue?: number;
  percentageError?: number;
  calculationSteps: string[];
  score: number;
  scoreDetails: ScoreDetail[];
}

export interface ScoreDetail {
  category: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface ExperimentState {
  diskParams: DiskParams;
  hangingMass: HangingMass;
  dataPoints: DataPoint[];
  anomalies: Anomaly[];
  history: HistoryRecord[];
  result: CalculationResult | null;
  gravity: number;
  activeDataPointIndex: number | null;
}

export interface UnitOption<T> {
  value: T;
  label: string;
  factor: number;
}
