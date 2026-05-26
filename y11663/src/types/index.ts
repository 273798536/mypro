
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Airfoil {
  id: string;
  name: string;
  chordLength: number;
  thickness: number;
  camber: number;
  coordinates: Point2D[];
}

export interface ExperimentParams {
  angleOfAttack: number;
  velocity: number;
  airDensity: number;
  reynoldsNumber: number;
}

export interface SamplingPoint {
  id: string;
  position: Point3D;
  pressure: number | null;
  isValid: boolean;
  surface: 'upper' | 'lower' | 'leading' | 'trailing';
}

export interface PressureField {
  airfoilId: string;
  params: ExperimentParams;
  samplingPoints: SamplingPoint[];
  minPressure: number;
  maxPressure: number;
  colorInverted: boolean;
}

export interface Modification {
  timestamp: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export type DataSource = 'manual' | 'import' | 'lecture';

export interface ExperimentRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  airfoil: Airfoil;
  params: ExperimentParams;
  pressureField: PressureField;
  source: DataSource;
  sourceNote?: string;
  modificationHistory: Modification[];
  notes: string;
  tags: string[];
}

export type AlertType = 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ValidationResult {
  isValid: boolean;
  alerts: Alert[];
}

export interface ColorStop {
  position: number;
  color: string;
}

export type RecordType = 'normal' | 'boundary' | 'bad';
