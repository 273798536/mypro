export interface ParticleType {
  id: string;
  name: string;
  mass: number;
  charge: number;
  color: string;
  description: string;
}

export interface OreType {
  id: string;
  name: string;
  mass: number;
  hardness: number;
  scoreValue: number;
  color: string;
  energyThreshold: number;
}

export interface Particle {
  id: string;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  trail: { x: number; y: number }[];
  active: boolean;
}

export interface OreBlock {
  id: string;
  type: OreType;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  collected: boolean;
  vx: number;
  vy: number;
}

export interface CollisionRecord {
  id: string;
  timestamp: number;
  frameIndex: number;
  particleId: string;
  oreId: string;
  oreName: string;
  position: { x: number; y: number };
  beforeCollision: {
    particleMomentum: { x: number; y: number };
    particleEnergy: number;
    oreVelocity: { x: number; y: number };
  };
  afterCollision: {
    particleMomentum: { x: number; y: number };
    particleEnergy: number;
    oreVelocity: { x: number; y: number };
  };
  physicsCheck: {
    momentumConserved: boolean;
    momentumError: { x: number; y: number };
    momentumDirectionWrong: boolean;
    wrongDirectionMaterial?: string;
    energyConserved: boolean;
    energyDifference: number;
    energyOverLimit: boolean;
    energyLimit: number;
    overLimitAmount: number;
  };
  scoreChange: number;
  penaltyReason?: string;
  oreCollected: boolean;
}

export interface GameFrame {
  frameIndex: number;
  particles: Particle[];
  oreBlocks: OreBlock[];
  timestamp: number;
}

export interface GameError {
  id: string;
  type: 'momentum_direction' | 'energy_over_limit' | 'other';
  message: string;
  materialName?: string;
  position: { x: number; y: number };
  collisionId: string;
  timestamp: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface GameState {
  status: GameStatus;
  currentRound: number;
  totalScore: number;
  baseScore: number;
  totalPenalty: number;
  energyUsed: number;
  maxEnergy: number;
  selectedParticle: ParticleType | null;
  launchAngle: number;
  launchPower: number;
  particles: Particle[];
  oreBlocks: OreBlock[];
  collisionHistory: CollisionRecord[];
  frameHistory: GameFrame[];
  currentFrame: number;
  errors: GameError[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface PhysicsConstants {
  MAX_ENERGY_PER_LAUNCH: number;
  TOTAL_ENERGY_BUDGET: number;
  ENERGY_CONSERVATION_TOLERANCE: number;
  MOMENTUM_CONSERVATION_TOLERANCE: number;
  GRAVITY: number;
  FRICTION: number;
  ELASTIC_COEFFICIENT: number;
  PARTICLE_RADIUS: number;
  MAX_TRAIL_LENGTH: number;
  FRAME_RATE: number;
}
