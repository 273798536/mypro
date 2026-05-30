import type { GameEvent, EventType } from './types';
import { generateId } from './algorithms';

type EventCallback = (event: GameEvent) => void;

class EventSystem {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private allListeners: Set<EventCallback> = new Set();

  on(type: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => this.listeners.get(type)!.delete(callback);
  }

  onAll(callback: EventCallback): () => void {
    this.allListeners.add(callback);
    return () => this.allListeners.delete(callback);
  }

  emit(type: EventType, timestamp: number, data: Record<string, any> = {}): GameEvent {
    const event: GameEvent = {
      id: generateId(),
      timestamp,
      type,
      data,
    };

    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(callback => callback(event));
    }
    this.allListeners.forEach(callback => callback(event));

    return event;
  }

  clear(): void {
    this.listeners.clear();
    this.allListeners.clear();
  }
}

export const eventSystem = new EventSystem();
