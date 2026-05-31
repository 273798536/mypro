import type { CacheEntry, CacheStrategy, CacheOperationResult } from '../types/cache';

export class LRUCache {
  private entries: Map<string, CacheEntry>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.entries = new Map();
    this.maxSize = maxSize;
  }

  get(dishId: string, now: number): CacheOperationResult {
    const entry = this.entries.get(dishId);
    if (!entry) {
      return { success: false, reason: 'miss' };
    }

    if (now >= entry.expiresAt) {
      return { success: false, reason: 'expired', entry };
    }

    this.entries.delete(dishId);
    const updatedEntry: CacheEntry = {
      ...entry,
      lastAccessedAt: now,
      accessCount: entry.accessCount + 1,
    };
    this.entries.set(dishId, updatedEntry);

    return { success: true, entry: updatedEntry };
  }

  set(entry: CacheEntry): CacheOperationResult {
    let evicted: CacheEntry | undefined;

    if (this.entries.has(entry.dishId)) {
      this.entries.delete(entry.dishId);
    }

    if (this.entries.size >= this.maxSize) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey) {
        evicted = this.entries.get(firstKey);
        this.entries.delete(firstKey);
      }
    }

    this.entries.set(entry.dishId, entry);

    return { success: true, entry, evicted };
  }

  getAll(): CacheEntry[] {
    return Array.from(this.entries.values());
  }

  getEntries(): Map<string, CacheEntry> {
    return this.entries;
  }

  clear(): void {
    this.entries.clear();
  }
}

export class LFUCache {
  private entries: Map<string, CacheEntry>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.entries = new Map();
    this.maxSize = maxSize;
  }

  get(dishId: string, now: number): CacheOperationResult {
    const entry = this.entries.get(dishId);
    if (!entry) {
      return { success: false, reason: 'miss' };
    }

    if (now >= entry.expiresAt) {
      return { success: false, reason: 'expired', entry };
    }

    const updatedEntry: CacheEntry = {
      ...entry,
      lastAccessedAt: now,
      accessCount: entry.accessCount + 1,
    };
    this.entries.set(dishId, updatedEntry);

    return { success: true, entry: updatedEntry };
  }

  set(entry: CacheEntry): CacheOperationResult {
    let evicted: CacheEntry | undefined;

    if (this.entries.has(entry.dishId)) {
      this.entries.set(entry.dishId, entry);
      return { success: true, entry };
    }

    if (this.entries.size >= this.maxSize) {
      const entries = Array.from(this.entries.values());
      entries.sort((a, b) => {
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.lastAccessedAt - b.lastAccessedAt;
      });
      evicted = entries[0];
      if (evicted) {
        this.entries.delete(evicted.dishId);
      }
    }

    this.entries.set(entry.dishId, entry);

    return { success: true, entry, evicted };
  }

  getAll(): CacheEntry[] {
    return Array.from(this.entries.values());
  }

  getEntries(): Map<string, CacheEntry> {
    return this.entries;
  }

  clear(): void {
    this.entries.clear();
  }
}

export class FIFOCache {
  private entries: Map<string, CacheEntry>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.entries = new Map();
    this.maxSize = maxSize;
  }

  get(dishId: string, now: number): CacheOperationResult {
    const entry = this.entries.get(dishId);
    if (!entry) {
      return { success: false, reason: 'miss' };
    }

    if (now >= entry.expiresAt) {
      return { success: false, reason: 'expired', entry };
    }

    const updatedEntry: CacheEntry = {
      ...entry,
      lastAccessedAt: now,
      accessCount: entry.accessCount + 1,
    };
    this.entries.set(dishId, updatedEntry);

    return { success: true, entry: updatedEntry };
  }

  set(entry: CacheEntry): CacheOperationResult {
    let evicted: CacheEntry | undefined;

    if (this.entries.has(entry.dishId)) {
      this.entries.set(entry.dishId, entry);
      return { success: true, entry };
    }

    if (this.entries.size >= this.maxSize) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey) {
        evicted = this.entries.get(firstKey);
        this.entries.delete(firstKey);
      }
    }

    this.entries.set(entry.dishId, entry);

    return { success: true, entry, evicted };
  }

  getAll(): CacheEntry[] {
    return Array.from(this.entries.values());
  }

  getEntries(): Map<string, CacheEntry> {
    return this.entries;
  }

  clear(): void {
    this.entries.clear();
  }
}

export class TTLCache {
  private entries: Map<string, CacheEntry>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.entries = new Map();
    this.maxSize = maxSize;
  }

  private cleanupExpired(now: number): void {
    for (const [key, entry] of this.entries) {
      if (now >= entry.expiresAt) {
        this.entries.delete(key);
      }
    }
  }

  get(dishId: string, now: number): CacheOperationResult {
    this.cleanupExpired(now);

    const entry = this.entries.get(dishId);
    if (!entry) {
      return { success: false, reason: 'miss' };
    }

    const updatedEntry: CacheEntry = {
      ...entry,
      lastAccessedAt: now,
      accessCount: entry.accessCount + 1,
    };
    this.entries.set(dishId, updatedEntry);

    return { success: true, entry: updatedEntry };
  }

  set(entry: CacheEntry, now: number): CacheOperationResult {
    this.cleanupExpired(now);

    let evicted: CacheEntry | undefined;

    if (this.entries.has(entry.dishId)) {
      this.entries.set(entry.dishId, entry);
      return { success: true, entry };
    }

    if (this.entries.size >= this.maxSize) {
      const entries = Array.from(this.entries.values());
      entries.sort((a, b) => a.expiresAt - b.expiresAt);
      evicted = entries[0];
      if (evicted) {
        this.entries.delete(evicted.dishId);
      }
    }

    this.entries.set(entry.dishId, entry);

    return { success: true, entry, evicted };
  }

  getAll(now: number): CacheEntry[] {
    this.cleanupExpired(now);
    return Array.from(this.entries.values());
  }

  getEntries(): Map<string, CacheEntry> {
    return this.entries;
  }

  clear(): void {
    this.entries.clear();
  }
}

export function createCache(strategy: CacheStrategy, maxSize: number) {
  switch (strategy) {
    case 'LRU':
      return new LRUCache(maxSize);
    case 'LFU':
      return new LFUCache(maxSize);
    case 'FIFO':
      return new FIFOCache(maxSize);
    case 'TTL':
      return new TTLCache(maxSize);
    default:
      return new LRUCache(maxSize);
  }
}

export const STRATEGY_CONFIG: Record<CacheStrategy, { name: string; description: string }> = {
  LRU: {
    name: 'LRU 最近最少使用',
    description: '淘汰最久未使用的缓存，适合访问模式稳定的场景',
  },
  LFU: {
    name: 'LFU 最不经常使用',
    description: '淘汰访问次数最少的缓存，适合热点数据明显的场景',
  },
  FIFO: {
    name: 'FIFO 先进先出',
    description: '按插入顺序淘汰，简单但易淘汰热点数据',
  },
  TTL: {
    name: 'TTL 过期时间',
    description: '按过期时间淘汰，需合理设置过期时间',
  },
};
