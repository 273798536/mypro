export interface Submarine {
  mass: number;
  volume: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface BallastTank {
  maxVolume: number;
  currentWater: number;
  waterDensity: number;
}

export interface TreasureChest {
  id: string;
  mass: number;
  volume: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface DensityZone {
  id: string;
  startY: number;
  endY: number;
  density: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OceanEnvironment {
  baseDensity: number;
  densityZones: DensityZone[];
  gravity: number;
  maxDepth: number;
  oxygenRemaining: number;
}

export interface BuoyancyCalculation {
  id: string;
  timestamp: number;
  fluidDensity: number;
  displacedVolume: number;
  gravity: number;
  buoyantForce: number;
  gravitationalForce: number;
  netForce: number;
  formula: string;
  trigger: string;
  totalMass: number;
  treasureImpact: number;
}

export type OperationType =
  | "BALLAST_FILL"
  | "BALLAST_DRAIN"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "MOVE_DOWN"
  | "MOVE_UP"
  | "COLLECT_TREASURE"
  | "TICK"
  | "DENSITY_ZONE_ENTER"
  | "DENSITY_ZONE_EXIT";

export interface OperationLog {
  id: string;
  timestamp: number;
  frame: number;
  operation: OperationType;
  parameters: Record<string, number | string | boolean>;
  buoyancyCalculationId: string;
  description: string;
  treasureAffected: boolean;
}

export type BoundaryType =
  | "DENSITY_CHANGE"
  | "OXYGEN_DEPLETED"
  | "COLLISION"
  | "EXCEED_MAX_DEPTH"
  | "SUCCESS"
  | "SURFACE_BREACH";

export interface GameResult {
  boundaryType: BoundaryType | null;
  success: boolean;
  message: string;
  timestamp: number;
  frame: number;
}

export interface GameStateSnapshot {
  frame: number;
  submarine: Submarine;
  ballastTank: BallastTank;
  treasureChest: TreasureChest | null;
  environment: OceanEnvironment;
  buoyancy: BuoyancyCalculation;
  operation: OperationLog | null;
  result: GameResult | null;
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime: number | null;
  withTreasure: boolean;
  snapshots: GameStateSnapshot[];
  operations: OperationLog[];
  calculations: BuoyancyCalculation[];
  result: GameResult | null;
}

export interface GameSettings {
  enableDensityZones: boolean;
  enableOxygen: boolean;
  enableCollision: boolean;
  withTreasure: boolean;
}

export type GamePhase = "idle" | "playing" | "paused" | "ended";

export interface ActiveInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fill: boolean;
  drain: boolean;
}
