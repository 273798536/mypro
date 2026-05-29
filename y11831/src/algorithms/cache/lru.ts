import { CachedItem } from '../../types/game';

export class LRUCache {
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
      this.items.delete(menuId);
      this.items.set(menuId, item);
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
      this.items.delete(menuId);
      this.items.set(menuId, existing);
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
    const firstKey = this.items.keys().next().value;
    if (firstKey) {
      const evicted = this.items.get(firstKey);
      this.items.delete(firstKey);
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
    return Array.from(this.items.values());
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
