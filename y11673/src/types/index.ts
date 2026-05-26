export type Vector3 = [number, number, number];

export interface RayState {
  position: Vector3;
  momentum: Vector3;
  wavelength: number;
}

export type RayStatus = 'complete' | 'absorbed' | 'escaped' | 'error' | 'running';

export interface IntegrationResult {
  id: number;
  points: Vector3[];
  status: RayStatus;
  errorMessage?: string;
  totalSteps: number;
  computationTime: number;
  discontinuities: number;
}

export interface SimulationParams {
  blackHoleMass: number;
  rayCount: number;
  rayAngleRange: number;
  rayImpactParameter: number;
  observationAngle: number;
  showGrid: boolean;
  showEventHorizon: boolean;
  showPhotonSphere: boolean;
  integrationSteps: number;
  stepSize: number;
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface SimulationStats {
  totalRays: number;
  absorbedRays: number;
  escapedRays: number;
  errorRays: number;
  averageSteps: number;
  totalComputationTime: number;
  fps: number;
}

export type ErrorType = 'parameter' | 'integration' | 'render' | 'performance';
export type ErrorSeverity = 'warning' | 'error' | 'critical';

export interface SimulationError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  timestamp: number;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface ParamRecord {
  id: string;
  timestamp: number;
  params: SimulationParams;
  stats: SimulationStats;
  note?: string;
}

export interface ExportData {
  version: string;
  exportTime: string;
  params: SimulationParams;
  stats: SimulationStats;
  errors: SimulationError[];
  raySummary: {
    id: number;
    status: RayStatus;
    steps: number;
    points: number;
  }[];
}

export const DEFAULT_PARAMS: SimulationParams = {
  blackHoleMass: 10,
  rayCount: 50,
  rayAngleRange: 60,
  rayImpactParameter: 10,
  observationAngle: 45,
  showGrid: true,
  showEventHorizon: true,
  showPhotonSphere: true,
  integrationSteps: 2000,
  stepSize: 0.05,
};

export const PARAM_CONSTRAINTS = {
  blackHoleMass: { min: 1, max: 100, warning: 50, critical: 80 },
  rayCount: { min: 10, max: 200, warning: 100, critical: 150 },
  integrationSteps: { min: 500, max: 5000, warning: 2000, critical: 4000 },
  stepSize: { min: 0.01, max: 0.5, warning: 0.1, critical: 0.3 },
  rayAngleRange: { min: 10, max: 180, warning: 120, critical: 150 },
  rayImpactParameter: { min: 3, max: 30, warning: 20, critical: 25 },
  observationAngle: { min: 0, max: 180, warning: 150, critical: 170 },
} as const;

export const PHYSICAL_CONSTANTS = {
  SCHWARZSCHILD_FACTOR: 2.953,
  SPEED_OF_LIGHT: 1,
  GRAVITATIONAL_CONSTANT: 1,
} as const;
