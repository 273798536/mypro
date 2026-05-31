export interface Submarine {
  x: number;
  y: number;
  depth: number;
  speed: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface Reef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rock' | 'coral' | 'debris';
  detected: boolean;
}

export interface Echo {
  id: string;
  distance: number;
  angle: number;
  strength: number;
  isMisjudged: boolean;
  actualTarget?: string;
  misjudgmentReason?: string;
  waveformData: number[];
}

export interface SonarPulse {
  id: string;
  timestamp: number;
  originX: number;
  originY: number;
  radius: number;
  maxRadius: number;
  echoes: Echo[];
  isComplete: boolean;
  isMisjudged: boolean;
}

export interface RemarkChange {
  id: string;
  timestamp: number;
  oldValue: string;
  newValue: string;
  author: string;
}

export interface DecisionRecord {
  id: string;
  timestamp: number;
  step: number;
  action: 'move' | 'sonar' | 'wait';
  direction?: string;
  speed?: number;
  sonarData?: SonarPulse;
  isMissingFields: boolean;
  isLateEntry: boolean;
  remarks?: string;
  remarkHistory?: RemarkChange[];
  consequence: 'safe' | 'near-miss' | 'collision' | 'misjudgment';
}

export interface Misjudgment {
  id: string;
  step: number;
  timestamp: number;
  sonarPulseId: string;
  reason: string;
  suggestion: string;
  impactOnScore: number;
  playerDecision: string;
  correctDecision: string;
  detectedWaveform: number[];
  actualWaveform: number[];
}

export type GamePhase = 'intro' | 'playing' | 'paused' | 'completed' | 'failed';

export interface GameState {
  submarine: Submarine;
  reefs: Reef[];
  sonarHistory: SonarPulse[];
  currentSonarPulse: SonarPulse | null;
  decisionLog: DecisionRecord[];
  misjudgments: Misjudgment[];
  currentPhase: GamePhase;
  currentStep: number;
  score: number;
  maxScore: number;
  targetPosition: { x: number; y: number };
  beatIndex: number;
  isBeatWindow: boolean;
  lastDecisionTime: number;
}

export interface LevelData {
  id: string;
  name: string;
  description: string;
  reefs: Omit<Reef, 'detected'>[];
  misjudgmentTriggers: MisjudgmentTrigger[];
  targetPosition: { x: number; y: number };
  startPosition: { x: number; y: number };
  maxSteps: number;
}

export interface MisjudgmentTrigger {
  step: number;
  type: 'ambiguous_echo' | 'multiple_reflections' | 'delayed_echo' | 'noise_interference';
  reason: string;
  suggestion: string;
  reefId?: string;
}

export interface WaveformPoint {
  x: number;
  y: number;
}
