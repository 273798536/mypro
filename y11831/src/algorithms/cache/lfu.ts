import { CachedItem } from '../../types/game';

export class LFUCache {
  private items: Map<string, CachedItem> = new Map();
  private capacity: number;
  private hits: number = 0;
  private misses: number = 0;
  private currentTime: number = 0;

  constructor(capacity: number = 5) {
    this.capacity = capacity;
  }

  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  get(menuId: string): CachedItem | undefined {
    const item = this.items.get(menuId);
    if (item) {
      this.hits++;
      item.lastAccessed = this.currentTime;
      item.accessCount++;
      return item;
    }
    this.misses++;
    return undefined;
  }

  put(menuId: string): CachedItem {
    const existing = this.items.get(menuId);
    if (existing) {
      existing.lastAccessed = this.currentTime;
      existing.accessCount++;
      return existing;
    }

    if (this.items.size >= this.capacity) {
      this.evict();
    }

    const newItem: CachedItem = {
      menuId,
      lastAccessed: this.currentTime,
      accessCount: 1,
      insertedAt: this.currentTime,
    };
    this.items.set(menuId, newItem);
    return newItem;
  }

  evict(): CachedItem | undefined {
    let minCount = Infinity;
    let oldestTime = Infinity;
    let evictKey: string | undefined;

    for (const [key, item] of this.items.entries()) {
      if (item.accessCount < minCount) {
        minCount = item.accessCount;
        oldestTime = item.insertedAt;
        evictKey = key;
      } else if (item.accessCount === minCount && item.insertedAt < oldestTime) {
        oldestTime = item.insertedAt;
        evictKey = key;
      }
    }

    if (evictKey) {
      const evicted = this.items.get(evictKey);
      this.items.delete(evictKey);
      return evicted;
    }
    return undefined;
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  getAll(): CachedItem[] {
    return Array.from(this.items.values()).sort((a, b) => b.accessCount - a.accessCount);
  }

  getCapacity(): number {
    return this.capacity;
  }

  reset(): void {
    this.items.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
