export type CellType = 'source' | 'canal' | 'valve' | 'plot' | 'empty';

export type ValveState = 'open' | 'closed';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'windy';

export type AnomalyType = 'drought' | 'overwater' | 'evaporation';

export type GamePhase = 'idle' | 'playing' | 'paused' | 'ended';

export type SampleType = 'normal' | 'boundary' | 'bad';

export interface Position {
  row: number;
  col: number;
}

export interface Cell {
  type: CellType;
  position: Position;
  hasWater: boolean;
}

export interface Plot {
  id: string;
  name: string;
  cropType: string;
  waterRequired: number;
  waterCurrent: number;
  isWatered: boolean;
  overwateredCount: number;
  position: Position;
}

export interface Valve {
  id: string;
  state: ValveState;
  position: Position;
}

export interface Weather {
  type: WeatherType;
  evaporationRate: number;
  description: string;
  icon: string;
}

export interface Anomaly {
  type: AnomalyType;
  message: string;
  round: number;
  plotId?: string;
  timestamp: number;
}

// 操作记录
export interface ActionRecord {
  round: number;
  valveId: string;
  action: 'open' | 'closed';
  timestamp: number;
}

export interface WaterFlowState {
  wateredPlots: string[];
  flowPath: Position[];
}

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  maxRounds: number;
  score: number;
  board: Cell[][];
  valves: Valve[];
  plots: Plot[];
  currentWeather: Weather;
  anomalies: Anomaly[];
  actionHistory: ActionRecord[];
  waterFlowState: WaterFlowState;
  totalWaterUsed: number;
  totalEvaporation: number;
}

export interface SampleRecord {
  id: string;
  name: string;
  type: SampleType;
  description: string;
  gameState: GameState;
  expectedOutcome: string;
}

export interface ReportData {
  gameState: GameState;
  finalScore: number;
  anomalies: Anomaly[];
  actions: ActionRecord[];
  summary: {
    totalRounds: number;
    successfulPlots: number;
    failedPlots: number;
    waterEfficiency: number;
  };
}
