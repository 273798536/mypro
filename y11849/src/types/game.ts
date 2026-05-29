export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export type SoundType = 'bass' | 'snare' | 'hihat' | 'melody' | 'fx';

export type EventType = 
  | 'sample_collect' 
  | 'sample_place' 
  | 'sample_conflict'
  | 'collision' 
  | 'fuel_low' 
  | 'fuel_empty'
  | 'rhythm_mismatch' 
  | 'storm_hit'
  | 'score_change';

export type ResultCategory = 'usable' | 'needs_confirm' | 'rhythm_mismatch';

export interface GameState {
  status: GameStatus;
  score: number;
  fuel: number;
  maxFuel: number;
  time: number;
  scoreBreakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  id: string;
  type: string;
  description: string;
  points: number;
  timestamp: number;
}

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

export interface Planet {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  soundType: SoundType;
  frequency: number;
  collected: boolean;
  rotation: number;
  rotationSpeed: number;
}

export interface Sample {
  id: string;
  planetId: string;
  soundType: SoundType;
  frequency: number;
  color: string;
  collectedAt: number;
}

export interface RhythmTrack {
  beats: (Sample | null)[];
  bpm: number;
  currentBeat: number;
  isPlaying: boolean;
}

export interface NoiseStorm {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  duration: number;
  startTime: number;
}

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface GameResult {
  category: ResultCategory;
  score: number;
  samplesCollected: number;
  samplesPlaced: number;
  rhythmQuality: number;
  fuelRemaining: number;
  events: GameEvent[];
  scoreBreakdown: ScoreBreakdown[];
  rhythmMismatchCount: number;
  sampleConflictCount: number;
  stormHitCount: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface KeyboardState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
}
