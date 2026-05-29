export interface GateConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'open' | 'closed' | 'fault';
  capacity: number;
}

export interface ExitConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: string;
}

export interface AreaConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blocked: boolean;
}

export interface EmergencyEvent {
  id: string;
  type: 'gate_fault' | 'station_close' | 'crowd_surge';
  triggerTime: number;
  affectedGates: string[];
  affectedAreas: string[];
  description: string;
  triggered: boolean;
  resolved: boolean;
}

export interface Passenger {
  id: string;
  x: number;
  y: number;
  targetExit: string;
  waitTime: number;
  status: 'moving' | 'waiting' | 'exited' | 'stuck';
  speed: number;
  path: { x: number; y: number }[];
  color: string;
}

export interface ActionLog {
  lineNumber: number;
  source: string;
  action: string;
  time: number;
  result: 'success' | 'warning' | 'error';
  details?: string;
}

export interface ScoreDetail {
  category: string;
  score: number;
  maxScore: number;
  reason: string;
}

export interface LevelConfig {
  id: string;
  name: string;
  maxPassengers: number;
  timeLimit: number;
  gates: GateConfig[];
  exits: ExitConfig[];
  areas: AreaConfig[];
  emergencyEvents: EmergencyEvent[];
}

export interface GameState {
  currentLevel: LevelConfig | null;
  passengers: Passenger[];
  gates: GateConfig[];
  areas: AreaConfig[];
  score: number;
  timeRemaining: number;
  actionLogs: ActionLog[];
  scoreDetails: ScoreDetail[];
  isPaused: boolean;
  isGameOver: boolean;
  isPlaying: boolean;
  currentEvent: EmergencyEvent | null;
  congestionZones: { x: number; y: number; radius: number }[];
  lineCounter: number;
  gameStartTime: number;
  lastEventTriggerTime: number;
  lastBroadcastTime: number;
  passengerDetourInfo: { passengerId: string; detourPercent: number }[];
}

export interface GameActions {
  startGame: (level: LevelConfig) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  toggleGate: (gateId: string) => void;
  toggleArea: (areaId: string) => void;
  sendBroadcast: (content: string, type: 'info' | 'warning' | 'emergency') => void;
  addPassenger: (passenger: Passenger) => void;
  updatePassenger: (id: string, updates: Partial<Passenger>) => void;
  addActionLog: (source: string, action: string, result: 'success' | 'warning' | 'error', details?: string) => void;
  updateScore: (delta: number, reason: string) => void;
  triggerEmergencyEvent: (event: EmergencyEvent) => void;
  resolveEmergencyEvent: () => void;
  setTimeRemaining: (time: number) => void;
  setCongestionZones: (zones: { x: number; y: number; radius: number }[]) => void;
  markEventTriggered: (eventId: string) => void;
  checkBroadcastMissed: () => void;
  addDetourWarning: (passengerId: string, detourPercent: number) => void;
}

export type GameStore = GameState & GameActions;