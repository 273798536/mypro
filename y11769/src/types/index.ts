export interface Correction {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
  source: string;
}

export interface Epicenter {
  id: string;
  position: [number, number, number];
  source: string;
  updatedAt: string;
  corrections: Correction[];
}

export interface MediumLayer {
  id: string;
  name: string;
  topDepth: number;
  bottomDepth: number;
  pVelocity: number;
  sVelocity: number;
  color: string;
  source: string;
  updatedAt: string;
  corrections: Correction[];
}

export interface Station {
  id: string;
  position: [number, number, number];
  label: string;
  source: string;
}

export interface ArrivalTime {
  stationId: string;
  waveType: 'P' | 'S';
  time: number;
  isValid: boolean;
  invalidReason?: string;
}

export interface RaySegment {
  start: [number, number, number];
  end: [number, number, number];
  layerId: string;
  waveType: 'P' | 'S';
  velocity: number;
  distance: number;
  travelTime: number;
}

export interface RayPath {
  waveType: 'P' | 'S';
  stationId: string;
  segments: RaySegment[];
  totalDistance: number;
  travelTime: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface ValidationResult {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  affectedIds: string[];
}

export interface WavefrontPoint {
  position: [number, number, number];
  rayIndex: number;
}

export interface WavefrontShape {
  waveType: 'P' | 'S';
  points: [number, number, number][];
  time: number;
}

export interface SampleData {
  id: string;
  category: 'normal' | 'boundary' | 'bad';
  label: string;
  description: string;
  epicenter: Epicenter;
  layers: MediumLayer[];
  stations: Station[];
  expectedValidationResults: ValidationResult[];
}
