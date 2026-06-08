export type CoordinateSystem = 'WGS84' | 'UTM50N' | 'LOCAL';

export type ReviewStepType = 'REPEAT_RUN' | 'SUPPLEMENT' | 'CONFIRM';

export type EdgeCaseType = 'UNIT_ERROR' | 'COORDINATE_MIX';

export interface Turbine {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  coordinateSystem: CoordinateSystem;
  rawNote?: string;
  hubHeight: number;
  rotorDiameter: number;
  isOffset?: boolean;
}

export interface SimulationParams {
  windSpeed: number;
  windSpeedUnit: 'm/s' | 'knots';
  windDirection: number;
  spacingMultiple: number;
  spacingUnit: 'D' | 'km' | 'nautical_mile';
  hubHeight: number;
  turbulenceIntensity: number;
}

export interface Viewpoint {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  createdAt: string;
}

export interface ScreenshotCapture {
  id: string;
  name: string;
  viewpoint: Viewpoint;
  dataUrl: string;
  parameterSnapshot: SimulationParams;
  colorLegendNotes: string;
  isOutOfBounds: boolean;
  outOfBoundsTurbines: string[];
  createdAt: string;
}

export interface WakeResult {
  turbineId: string;
  turbineName: string;
  incomingSpeed: number;
  wakeLossPercent: number;
  affectedBy: string[];
  isOutOfBounds: boolean;
}

export interface Conclusion {
  id: string;
  modelVersion: 'old' | 'new';
  content: string;
  totalWakeLoss: number;
  wakeResults: WakeResult[];
  affectedTurbines: string[];
  createdAt: string;
}

export interface ReviewStep {
  id: string;
  stepType: ReviewStepType;
  completed: boolean;
  operator: string;
  comment: string;
  repeatCount?: number;
  supplementedFields?: string[];
  signatureDataUrl?: string;
  completedAt?: string;
}

export interface EdgeCase {
  id: string;
  caseType: EdgeCaseType;
  title: string;
  description: string;
  impact: string;
  payload: Record<string, unknown>;
}

export interface HighlightState {
  turbineIds: string[];
  type: 'difference' | 'out-of-bounds' | 'selected';
}
