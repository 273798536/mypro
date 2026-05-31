import type { CacheStrategy } from './cache';
import type { QueueScheduler } from './queue';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';
export type GameSpeed = 1 | 2 | 3;

export interface ScoreBreakdown {
  base: number;
  cacheHitBonus: number;
  dirtyDataPenalty: number;
  sourceLimitPenalty: number;
  complaintPenalty: number;
  breakdownPenalty: number;
}

export interface GameStats {
  totalOrders: number;
  completedOrders: number;
  cacheHits: number;
  cacheMisses: number;
  cacheExpired: number;
  sourceRequests: number;
  concurrentSource: number;
  maxConcurrentSource: number;
  dirtySpreads: number;
  cacheBreakdowns: number;
  expiredMisreads: number;
  customerComplaints: number;
}

export interface GameState {
  status: GameStatus;
  startTime: number | null;
  endTime: number | null;
  pausedAt: number | null;
  totalPauseTime: number;
  speed: GameSpeed;
  cacheStrategy: CacheStrategy;
  queueScheduler: QueueScheduler;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  stats: GameStats;
  sourceLimit: number;
  gameDuration: number;
}

export const INITIAL_SCORE_BREAKDOWN: ScoreBreakdown = {
  base: 0,
  cacheHitBonus: 0,
  dirtyDataPenalty: 0,
  sourceLimitPenalty: 0,
  complaintPenalty: 0,
  breakdownPenalty: 0,
};

export const INITIAL_STATS: GameStats = {
  totalOrders: 0,
  completedOrders: 0,
  cacheHits: 0,
  cacheMisses: 0,
  cacheExpired: 0,
  sourceRequests: 0,
  concurrentSource: 0,
  maxConcurrentSource: 0,
  dirtySpreads: 0,
  cacheBreakdowns: 0,
  expiredMisreads: 0,
  customerComplaints: 0,
};

export const SOURCE_LIMIT = 3;
export const GAME_DURATION = 120000;
