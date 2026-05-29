export type CardType = 'rain' | 'pump' | 'garden' | 'pipe';

export interface CardEffect {
  waterChange?: number;
  pumpLoad?: number;
  gardenCapacity?: number;
  pipeFlow?: number;
}

export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  effect: CardEffect;
}

export interface CityState {
  waterLevel: number;
  pumpLoad: number;
  pumpCapacity: number;
  gardenCapacity: number;
  gardenMaxCapacity: number;
  lowAreaWater: number;
}

export type AlertType = 'pump_overload' | 'low_area_flood' | 'garden_depleted';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  severity: 'warning' | 'critical';
  stepIndex: number;
  confirmed: boolean;
}

export interface CalcTraceNode {
  id: string;
  label: string;
  value: number;
  formula?: string;
  source?: string;
  children?: CalcTraceNode[];
}

export interface GameStep {
  index: number;
  action: string;
  cardUsed?: Card;
  stateBefore: CityState;
  stateAfter: CityState;
  calcTrace: CalcTraceNode;
  scoreChange: number;
  scoreReason: string;
  alerts: Alert[];
  timestamp: number;
}

export type GamePhase = 'start' | 'playing' | 'ended';

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  score: number;
  cityState: CityState;
  handCards: Card[];
  currentRainCard?: Card;
  steps: GameStep[];
  activeAlerts: Alert[];
  confirmedAlerts: Alert[];
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'DRAW_RAIN_CARD'; card: Card }
  | { type: 'PLAY_CARD'; card: Card }
  | { type: 'CONFIRM_ALERT'; alertId: string }
  | { type: 'END_ROUND' }
  | { type: 'END_GAME' }
  | { type: 'RESET_GAME' };
