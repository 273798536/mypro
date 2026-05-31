export interface Position {
  x: number;
  y: number;
}

export type ToolType = 'select' | 'place' | 'cable' | 'walk' | 'delete';

export type DeviceType = 'speaker' | 'mic_stand' | 'mixer' | 'effect_pedal' | 'di_box' | 'monitor';

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  icon: string;
  size: { width: number; height: number };
  priority: number;
  score: number;
  color: string;
}

export interface PlacedDevice {
  id: string;
  deviceType: DeviceType;
  position: Position;
  placedAt: number;
  name: string;
}

export interface Cable {
  id: string;
  from: Position;
  to: Position;
  color: string;
  points: Position[];
  label: string;
}

export interface WalkPath {
  id: string;
  musician: string;
  points: Position[];
  color: string;
}

export type ConflictType = 'cable_cross' | 'device_block' | 'walk_conflict';
export type ConflictSeverity = 'warning' | 'error';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  positions: Position[];
  description: string;
  penalty: number;
  involvedElements: string[];
  humanExplanation: string;
}

export type ActionType = 'place_device' | 'remove_device' | 'draw_cable' | 'remove_cable' | 'draw_path' | 'remove_path';

export interface Action {
  id: string;
  type: ActionType;
  timestamp: number;
  payload: any;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface Level {
  id: string;
  name: string;
  version: string;
  source: string;
  description: string;
  timeLimit: number;
  gridSize: { width: number; height: number };
  requiredDevices: { type: DeviceType; count: number }[];
  requiredCables: { from: string; to: string; label: string }[];
  requiredPaths: { musician: string; count: number }[];
  blockedAreas: Position[];
  createdAt: string;
  updatedAt: string;
}

export interface GameState {
  status: GameStatus;
  timeLeft: number;
  totalTime: number;
  score: number;
  baseScore: number;
  penalties: number;
  level: Level;
  placedDevices: PlacedDevice[];
  cables: Cable[];
  walkPaths: WalkPath[];
  conflicts: Conflict[];
  history: Action[];
  currentTool: ToolType;
  selectedDevice: DeviceType | null;
  cableStart: Position | null;
  walkStart: Position | null;
  walkPoints: Position[];
  gameStartTime: number | null;
  gameEndTime: number | null;
  reportMetadata: {
    gameVersion: string;
    playedAt: string;
  } | null;
}

export interface ReviewState {
  currentFrame: number;
  isPlaying: boolean;
  historyStates: GameState[];
}
