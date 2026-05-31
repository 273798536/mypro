import type { Card } from './card';
import type { CityStatus } from './city';
import type { EventChain } from './event';
import type { RiskRecord } from './risk';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'settled';

export type LogType = 'action' | 'event' | 'risk' | 'system';

export interface LogEntry {
  id: string;
  round: number;
  timestamp: number;
  type: LogType;
  message: string;
  cardId?: string;
}

export interface GameState {
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  elapsedTime: number;
  score: number;
  maxScore: number;
  hand: Card[];
  deck: Card[];
  discardPile: Card[];
  city: CityStatus;
  eventChains: EventChain[];
  riskRecords: RiskRecord[];
  log: LogEntry[];
  activeRainfall: number;
  playedCardsThisRound: Card[];
  replayMode: boolean;
  replayIndex: number;
  stateHistory: GameStateSnapshot[];
}

export interface GameStateSnapshot {
  round: number;
  city: CityStatus;
  score: number;
  activeRainfall: number;
  logMessage: string;
}

export const TOTAL_ROUNDS = 15;
export const INITIAL_HAND_SIZE = 5;
export const CARDS_PER_ROUND = 1;
export const MAX_HAND_SIZE = 8;
export const MAX_SCORE = 1000;
export const ROUND_TIME_LIMIT = 30;

export const logTypeColors: Record<LogType, string> = {
  action: 'text-blue-400',
  event: 'text-cyan-400',
  risk: 'text-red-400',
  system: 'text-gray-400',
};

export const logTypeBgColors: Record<LogType, string> = {
  action: 'bg-blue-500/10',
  event: 'bg-cyan-500/10',
  risk: 'bg-red-500/10',
  system: 'bg-gray-500/10',
};
