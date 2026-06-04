import { create } from 'zustand';
import type { Annotation } from '../types/annotation';
import type { CanvasSnapshot } from '../types/physics';

type HistoryEntryType = 'annotation_create' | 'annotation_update' | 'annotation_delete' | 'level_reset';

interface HistoryState {
  annotations: Annotation[];
  snapshots: CanvasSnapshot[];
  currentTime: number;
}

interface HistoryEntry {
  type: HistoryEntryType;
  state: HistoryState;
  timestamp: number;
  description: string;
}

interface HistoryStoreState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxHistory: number;
}

interface HistoryStoreActions {
  pushHistory: (type: HistoryEntryType, state: HistoryState, description: string) => void;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  applyState: (state: HistoryState) => void;
}

export type HistoryStore = HistoryStoreState & HistoryStoreActions;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  pushHistory: (type, state, description) => {
    set((stateStore) => {
      const newPast = [
        ...stateStore.past,
        {
          type,
          state: JSON.parse(JSON.stringify(state)),
          timestamp: Date.now(),
          description,
        },
      ];

      if (newPast.length > stateStore.maxHistory) {
        newPast.shift();
      }

      return {
        past: newPast,
        future: [],
      };
    });
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;

    const entry = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set((state) => ({
      past: newPast,
      future: [entry, ...state.future],
    }));

    return entry.state;
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;

    const entry = future[0];
    const newFuture = future.slice(1);

    set((state) => ({
      past: [...state.past, entry],
      future: newFuture,
    }));

    return entry.state;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearHistory: () => set({ past: [], future: [] }),

  applyState: (state) => {
    import('./index').then(({ useAnnotationStore, usePhysicsStore }) => {
      useAnnotationStore.setState({
        annotations: state.annotations,
      });
      
      const annotationManager = useAnnotationStore.getState().manager;
      annotationManager.importAnnotations(state.annotations);
      
      usePhysicsStore.setState({
        snapshots: state.snapshots,
        currentTime: state.currentTime,
      });
    });
  },
}));
