import { Vector3 } from 'three';

export interface Ball {
  id: string;
  mass: number;
  radius: number;
  position: Vector3;
  velocity: Vector3;
  color: string;
  label: string;
  source?: string;
  sourceLine?: number;
}

export interface BallState extends Ball {
  trail: Vector3[];
}

export interface PhysicsError {
  id: string;
  type: 'momentum_gain' | 'penetration' | 'param_out_of_bounds';
  message: string;
  timestamp: number;
  sourceLocation: string;
  ballIds: string[];
  severity: 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ModificationTrace {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  source?: string;
}

export interface ExperimentRecord {
  id: string;
  timestamp: number;
  initialBalls: Ball[];
  finalBalls: Ball[];
  momentumBefore: { x: number; y: number; z: number; magnitude: number };
  momentumAfter: { x: number; y: number; z: number; magnitude: number };
  kineticEnergyBefore: number;
  kineticEnergyAfter: number;
  errors: PhysicsError[];
  screenshot?: string;
  modificationTraces: ModificationTrace[];
}

export interface PlaybackFrame {
  time: number;
  balls: Ball[];
  momentum: { x: number; y: number; z: number; magnitude: number };
  kineticEnergy: number;
}

export interface ExperimentSettings {
  friction: number;
  tableWidth: number;
  tableHeight: number;
  gravity: number;
}

export interface ExperimentState {
  balls: BallState[];
  settings: ExperimentSettings;
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
  errors: PhysicsError[];
  records: ExperimentRecord[];
  playbackFrames: PlaybackFrame[];
  initialMomentum: { x: number; y: number; z: number; magnitude: number } | null;
  initialKineticEnergy: number | null;
  modificationTraces: ModificationTrace[];
}
