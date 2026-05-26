export interface Pendulum {
  id: number;
  length: number;
  mass: number;
  initialAngle: number;
  angle: number;
  angularVelocity: number;
  phase: number;
  color: string;
}

export interface CouplingParams {
  couplingCoeff: number;
  timeStep: number;
  damping: number;
  gravity: number;
}

export type CorrectionType = 'angle_overflow' | 'numerical_explosion' | 'phase_mismatch';

export interface CorrectionEntry {
  time: number;
  type: CorrectionType;
  description: string;
  autoFixed: boolean;
  beforeValue?: number;
  afterValue?: number;
  pendulumId?: number;
}

export type ExperimentStatus = 'normal' | 'corrected' | 'needs_review';

export interface ExperimentRecord {
  id: string;
  timestamp: number;
  params: CouplingParams;
  pendulums: Pendulum[];
  status: ExperimentStatus;
  corrections: CorrectionEntry[];
  note?: string;
}

export interface PhaseHistory {
  time: number;
  phases: number[];
}

export interface SimulationState {
  isRunning: boolean;
  currentTime: number;
  timeStep: number;
  speedMultiplier: number;
  pendulums: Pendulum[];
  couplingParams: CouplingParams;
  phaseHistory: PhaseHistory[];
  corrections: CorrectionEntry[];
  experimentRecords: ExperimentRecord[];
}

export interface PresetConfig {
  name: string;
  description: string;
  pendulumCount: number;
  lengths: number[];
  masses: number[];
  initialAngles: number[];
  couplingCoeff: number;
  damping: number;
  timeStep: number;
}
