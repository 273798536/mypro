
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { HistoryAction, HistoryActionType } from '../types';

interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
  maxHistory: number;
  addAction: (
    type: HistoryActionType,
    description: string,
    previousState: Record<string, unknown>,
    nextState: Record<string, unknown>
  ) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  addAction: (type, description, previousState, nextState) => {
    const action: HistoryAction = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      description,
      previousState,
      nextState,
    };

    set((state) => {
      const newPast = [...state.past, action].slice(-state.maxHistory);
      return {
        past: newPast,
        future: [],
      };
    });
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const lastAction = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [lastAction, ...future];

    set({ past: newPast, future: newFuture });
    return lastAction;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;

    const nextAction = future[0];
    const newPast = [...past, nextAction];
    const newFuture = future.slice(1);

    set({ past: newPast, future: newFuture });
    return nextAction;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearHistory: () => set({ past: [], future: [] }),
}));
