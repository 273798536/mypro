export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO' | 'TTL';

export interface CacheEntry {
  dishId: string;
  dishName: string;
  value: {
    recipe: string;
    quality: number;
  };
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  ttl: number;
  expiresAt: number;
  version: string;
  isDirty: boolean;
  sourceRequestId?: string;
  evictionRank?: number;
}

export interface CacheState {
  entries: Map<string, CacheEntry>;
  maxSize: number;
  strategy: CacheStrategy;
  hits: number;
  misses: number;
  expired: number;
}

export interface CacheOperationResult {
  success: boolean;
  entry?: CacheEntry;
  evicted?: CacheEntry;
  reason?: string;
}
