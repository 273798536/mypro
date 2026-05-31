import type { CacheEntry } from './cache';

export type EventType = 
  | 'order_created'
  | 'cache_check'
  | 'source_start'
  | 'source_complete'
  | 'serve'
  | 'dirty_spread'
  | 'cache_breakdown'
  | 'expired_misread'
  | 'timeout'
  | 'strategy_change'
  | 'scheduler_change'
  | 'game_start'
  | 'game_pause'
  | 'game_resume'
  | 'game_end';

export interface Evidence {
  id: string;
  orderId?: string;
  eventType: EventType;
  timestamp: number;
  gameTime: number;
  cacheSnapshot: CacheEntry[];
  patienceSnapshot?: number;
  decision: string;
  scoreChange: number;
  details: Record<string, any>;
}

export interface EvidenceTimeline {
  events: Evidence[];
  currentIndex: number;
}

export interface ProblemAnalysis {
  cacheBreakdowns: Evidence[];
  dirtySpreads: Evidence[];
  expiredMisreads: Evidence[];
  timeouts: Evidence[];
}
