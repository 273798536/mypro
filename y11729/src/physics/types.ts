export interface SimulationParams {
  initialVelocity: number;
  launchAngle: number;
  dragCoefficient: number;
  arrowMass: number;
  targetDistance: number;
  timeStep: number;
  arrowDiameter: number;
}

export interface TrajectoryPoint {
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax?: number;
  ay?: number;
  dragForce?: number;
}

export interface SimulationMetrics {
  noDragLanding: { x: number; y: number; time: number };
  withDragLanding: { x: number; y: number; time: number };
  landingError: number;
  verticalErrorAtTarget: number;
  maxHeight: { noDrag: number; withDrag: number };
  isExtrapolated: boolean;
  energyLoss: number;
  timeOfFlight: { noDrag: number; withDrag: number };
}

export type WarningType =
  | 'ANGLE_OUT_OF_RANGE'
  | 'NUMERICAL_INSTABILITY'
  | 'RANGE_EXCEEDED'
  | 'DRAG_TOO_HIGH'
  | 'TIME_STEP_TOO_LARGE';

export interface Warning {
  type: WarningType;
  message: string;
  severity: 'warning' | 'error';
  suggestion?: string;
}

export interface IntegrationStep {
  step: number;
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  k1?: { vx: number; vy: number };
  k2?: { vx: number; vy: number };
  k3?: { vx: number; vy: number };
  k4?: { vx: number; vy: number };
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  params: SimulationParams;
  noDragTrajectory: TrajectoryPoint[];
  withDragTrajectory: TrajectoryPoint[];
  integrationSteps: IntegrationStep[];
  warnings: Warning[];
  metrics: SimulationMetrics;
}

export interface CalculationFormula {
  name: string;
  formula: string;
  description: string;
}
