import { HistoryEntry } from '../types';
import { generateId } from './coordinateUtils';

const MAX_HISTORY_SIZE = 50;

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  push(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const fullEntry: HistoryEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    this.undoStack.push(fullEntry);
    this.redoStack = [];

    if (this.undoStack.length > MAX_HISTORY_SIZE) {
      this.undoStack.shift();
    }

    this.notify();
  }

  undo(): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (entry) {
      this.redoStack.push(entry);
      this.notify();
    }
    return entry || null;
  }

  redo(): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (entry) {
      this.undoStack.push(entry);
      this.notify();
    }
    return entry || null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoStack(): HistoryEntry[] {
    return [...this.undoStack];
  }

  getRedoStack(): HistoryEntry[] {
    return [...this.redoStack];
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

export const historyManager = new HistoryManager();
