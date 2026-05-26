export type SlopeDifficulty = 'green' | 'blue' | 'black' | 'double-black';

export type WeatherCondition = 'sunny' | 'cloudy' | 'light-snow' | 'heavy-snow' | 'blizzard';

export type InjuryType = 'abrasion' | 'sprain' | 'fracture' | 'unconscious' | 'cardiac-arrest';

export type EquipmentType = 'stretcher' | 'oxygen' | 'aed' | 'first-aid' | 'rope' | 'radio';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'won' | 'lost';

export type WarningType = 'equipment-mismatch' | 'route-closed' | 'injury-worsening';

export type GameDifficulty = 'easy' | 'normal' | 'hard';

export interface SlopeNode {
  id: string;
  name: string;
  x: number;
  y: number;
  difficulty: SlopeDifficulty;
  isOpen: boolean;
  connectedTo: string[];
}

export interface Victim {
  id: string;
  name: string;
  location: string;
  injury: InjuryType;
  severity: number;
  requiredEquipment: EquipmentType[];
  timeRemaining: number;
  initialTime: number;
  isRescued: boolean;
  isFailed: boolean;
}

export interface Patroller {
  id: string;
  name: string;
  status: 'idle' | 'en-route' | 'rescuing' | 'returning';
  currentLocation: string;
  targetLocation: string | null;
  equipment: EquipmentType[];
  assignedVictim: string | null;
  progress: number;
}

export interface WarningRecord {
  id: string;
  type: WarningType;
  message: string;
  timestamp: number;
  isResolved: boolean;
  resolvedAt?: number;
  source?: string;
  correction?: string;
}

export interface RescueReport {
  totalVictims: number;
  rescued: number;
  failed: number;
  unhandled: number;
  corrected: number;
  needsConfirmation: number;
  warnings: WarningRecord[];
  totalTime: number;
  score: number;
  grade: string;
  breakdown: {
    successRate: number;
    speedScore: number;
    equipmentScore: number;
    warningScore: number;
  };
}

export interface ActionRecord {
  id: string;
  type: 'dispatch' | 'equip' | 'rescue' | 'warning' | 'correction' | 'game';
  timestamp: number;
  description: string;
  details: Record<string, unknown>;
}

export interface GameState {
  status: GameStatus;
  difficulty: GameDifficulty;
  currentTime: number;
  totalTime: number;
  weather: WeatherCondition;
  slopeMap: SlopeNode[];
  victims: Victim[];
  patrollers: Patroller[];
  warnings: WarningRecord[];
  actionHistory: ActionRecord[];
  report: RescueReport | null;
  selectedPatroller: string | null;
  selectedVictim: string | null;
}

export interface GameActions {
  startGame: (difficulty: GameDifficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  selectPatroller: (id: string | null) => void;
  selectVictim: (id: string | null) => void;
  dispatchPatroller: (patrollerId: string, victimId: string, equipment: EquipmentType[]) => void;
  addWarning: (type: WarningType, message: string, source?: string) => void;
  resolveWarning: (warningId: string, correction?: string) => void;
  updateTimer: () => void;
  generateReport: () => void;
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;
