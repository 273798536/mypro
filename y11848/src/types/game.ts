export type CacheStatus = 'valid' | 'expired' | 'dirty' | 'empty';

export type RequestType = 'read' | 'write' | 'delete';

export type EventType = 
  | 'hit' 
  | 'miss' 
  | 'dirty_read' 
  | 'expired_read' 
  | 'breakdown' 
  | 'breakdown_prevented'
  | 'timeout' 
  | 'write' 
  | 'delete'
  | 'refresh'
  | 'evict';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CacheEntry {
  id: string;
  key: string;
  value: string;
  ttl: number;
  maxTtl: number;
  status: CacheStatus;
  dirtySource?: string;
  lastAccessed: number;
  loading?: boolean;
}

export interface Request {
  id: string;
  type: RequestType;
  key: string;
  expectedValue?: string;
  timeout: number;
  createdAt: number;
  isHotKey: boolean;
  penalty: number;
  loading?: boolean;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: EventType;
  key?: string;
  message: string;
  scoreChange: number;
  details?: Record<string, any>;
}

export interface DifficultyConfig {
  gridSize: number;
  requestInterval: number;
  hotKeyProbability: number;
  dirtyProbability: number;
  gameDuration: number;
  requestTimeout: number;
  cacheTtl: number;
}

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty;
  score: number;
  totalRequests: number;
  cacheHits: number;
  cache: CacheEntry[];
  requestQueue: Request[];
  eventLog: GameEvent[];
  startTime: number;
  elapsedTime: number;
  breakdownsPrevented: number;
  breakdownsOccurred: number;
  speed: number;
  selectedCacheId: string | null;
  selectedRequestId: string | null;
}

export interface PenaltyItem {
  event: GameEvent;
  reason: string;
  suggestion: string;
}

export interface SettlementReport {
  totalScore: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  events: GameEvent[];
  penalties: PenaltyItem[];
  breakdownAnalysis: {
    total: number;
    prevented: number;
    occurred: number;
    preventedDetails: GameEvent[];
    occurredDetails: GameEvent[];
  };
  stats: {
    dirtyReads: number;
    expiredReads: number;
    timeouts: number;
    breakdowns: number;
  };
}
