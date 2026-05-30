export interface Planet {
  id: string;
  name: string;
  orbitalRadius: number;
  angularSpeed: number;
  currentAngle: number;
  color: string;
  size: number;
}

export interface Spacecraft {
  id: string;
  fuel: number;
  maxFuel: number;
  currentOrbitRadius: number;
  currentAngle: number;
  status: 'idle' | 'transferring' | 'stranded' | 'arrived';
  targetOrbitRadius: number | null;
  transferProgress: number;
}

export interface TransferWindow {
  id: string;
  targetPlanetId: string;
  targetPlanetName: string;
  openTime: number;
  closeTime: number;
  optimalTime: number;
  fuelCost: number;
  isMissed: boolean;
  timeOffset: number;
}

export type StepResultType = 'success' | 'window_missed' | 'fuel_insufficient' | 'orbit_intersect';

export interface GameStep {
  stepIndex: number;
  selectedWindowId: string;
  targetPlanetName: string;
  fuelConsumed: number;
  fuelRemaining: number;
  scoreDelta: number;
  resultType: StepResultType;
  anomalyType: string | null;
  timeOffset: number;
  description: string;
}

export type AnomalyType = 'fuel_insufficient' | 'orbit_intersect' | 'window_missed';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  description: string;
  stepIndex: number;
  isResolved: boolean;
}

export type BadRowSource = 'fuel_bar' | 'mission_log' | 'orbit_data';

export interface BadRow {
  lineNumber: number;
  rawContent: string;
  reason: string;
  source: BadRowSource;
}

export interface GameStateSnapshot {
  stepIndex: number;
  planets: Planet[];
  spacecraft: Spacecraft;
  score: number;
  fuelAtStep: number;
}

export type GamePhase = 'setup' | 'playing' | 'paused' | 'finished';

export type ReviewerFilter = 'all' | 'fuel_insufficient' | 'orbit_intersect' | 'window_missed';
