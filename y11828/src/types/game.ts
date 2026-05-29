export interface SeededRandom {
  seed: number;
  next(): number;
  nextInt(min: number, max: number): number;
}

export interface TrackNode {
  id: string;
  x: number;
  y: number;
  connections: string[];
  isSwitch?: boolean;
  switchState?: string;
}

export interface TrackSegment {
  id: string;
  startNode: string;
  endNode: string;
  type: 'straight' | 'curve' | 'switch';
}

export interface CartPhysics {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  angle: number;
}

export interface EnergyState {
  current: number;
  max: number;
  consumptionRate: number;
  lowThreshold: number;
}

export interface MinecartConfig {
  id: string;
  name: string;
  mass: number;
  friction: number;
  energyConsumption: number;
  maxSpeed: number;
  acceleration: number;
}

export interface Minecart {
  configId: string;
  physics: CartPhysics;
  currentSegment: string;
  progress: number;
  energy: number;
  oreCount: number;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: 'meteor' | 'ore' | 'base' | 'collision' | 'switch' | 'energy_critical' | 'game_end';
  data: Record<string, unknown>;
  needsConfirmation?: boolean;
  confirmed?: boolean;
}

export interface Level {
  id: string;
  name: string;
  type: 'normal' | 'border';
  description: string;
  trackNodes: TrackNode[];
  trackSegments: TrackSegment[];
  startNode: string;
  endNode: string;
  initialEnergy: number;
  timeLimit: number;
  oreLocations: { x: number; y: number; amount: number }[];
  meteorSchedule?: { time: number; x: number; y: number }[];
  collisionCarts?: { x: number; y: number; vx: number; vy: number }[];
  seed: number;
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  switchLeft: boolean;
  switchRight: boolean;
}

export interface GameState {
  phase: 'menu' | 'playing' | 'paused' | 'finished';
  currentLevel: Level | null;
  minecart: Minecart | null;
  energy: EnergyState | null;
  events: GameEvent[];
  time: number;
  deltaTime: number;
  seed: number;
  speed: number;
  success: boolean;
}

export interface EnergyHistoryPoint {
  time: number;
  energy: number;
  reason?: string;
}

export interface FailureAnalysis {
  primaryCause: 'energy' | 'collision' | 'track' | 'timeout' | 'other';
  causePercentage: Record<string, number>;
  timeline: { time: number; event: string; impact: number }[];
  suggestions: string[];
}

export interface RunResult {
  runId: string;
  levelId: string;
  configId: string;
  seed: number;
  success: boolean;
  totalTime: number;
  finalEnergy: number;
  oreCollected: number;
  maxSpeed: number;
  energyUsed: number;
  events: GameEvent[];
  energyHistory: EnergyHistoryPoint[];
  failureAnalysis?: FailureAnalysis;
  timestamp: number;
}

export interface ComparisonResult {
  field: string;
  oldValue: number | string | boolean;
  newValue: number | string | boolean;
  change: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PendingConfirmation {
  eventId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}
