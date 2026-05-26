export type SpeedUnit = 'm/s' | 'km/h' | 'mph';

export type AngleUnit = 'deg' | 'rad';

export type SpinUnit = 'rpm';

export interface TrajectorySource {
  type: 'manual' | 'import' | 'record';
  origin?: string;
  lineNumber?: number;
}

export interface TrajectoryParams {
  id: string;
  source: TrajectorySource;
  timestamp: number;

  ballSpeed: number;
  ballSpeedUnit: SpeedUnit;
  launchAngle: number;
  launchDirection: number;
  backspin: number;
  sidespin: number;

  windSpeed: number;
  windSpeedUnit: SpeedUnit;
  windDirection: number;
  temperature: number;
  humidity: number;
  altitude: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface TrajectoryLanding {
  x: number;
  z: number;
  distance: number;
  carry: number;
  roll: number;
  outOfBounds: boolean;
  outOfBoundsReason?: string;
}

export interface TrajectoryApex {
  height: number;
  distance: number;
  time: number;
}

export interface TrajectoryResult {
  params: TrajectoryParams;
  points: TrajectoryPoint[];
  landing: TrajectoryLanding;
  apex: TrajectoryApex;
  flightTime: number;
  calculationTime: number;
  validation: ValidationResult;
}

export type ValidationSeverity = 'warning' | 'error' | 'critical';

export interface ValidationError {
  code: string;
  message: string;
  severity: ValidationSeverity;
  source: {
    field: string;
    value: unknown;
    lineNumber?: number;
    origin?: string;
  };
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export const DEFAULT_PARAMS: TrajectoryParams = {
  id: '',
  source: { type: 'manual' },
  timestamp: Date.now(),
  ballSpeed: 75,
  ballSpeedUnit: 'm/s',
  launchAngle: 14,
  launchDirection: 0,
  backspin: 2500,
  sidespin: 0,
  windSpeed: 0,
  windSpeedUnit: 'm/s',
  windDirection: 0,
  temperature: 20,
  humidity: 50,
  altitude: 0,
};

export const COMPARE_COLORS = ['#32E0C4', '#FFC93C', '#FF6B6B', '#14FFEC'];
