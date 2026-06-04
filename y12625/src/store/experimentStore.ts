import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Level, Annotation, Operation, ToolType, Point, ExperimentResult } from '@/types';
import { LEVELS } from '@/data/levels';
import { generateId } from '@/utils/grid';

interface HistoryState {
  history: Operation[];
  historyIndex: number;
  
  pushHistory: (operation: Operation) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  historyIndex: -1,

  pushHistory: (operation) => {
    set((state) => {
      const newHistory = state.historyIndex < state.history.length - 1
        ? state.history.slice(0, state.historyIndex + 1)
        : [...state.history];
      
      return {
        history: [...newHistory, operation],
        historyIndex: newHistory.length
      };
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < 0) return;

    const operation = history[historyIndex];

    if (operation.type === 'draw') {
      useExperimentStore.setState((state) => ({
        annotations: state.annotations.filter(a => a.id !== operation.annotationId)
      }));
    } else if (operation.type === 'delete') {
      useExperimentStore.setState((state) => ({
        annotations: [...state.annotations, operation.beforeState as Annotation]
      }));
    } else if (operation.type === 'modify') {
      useExperimentStore.setState((state) => ({
        annotations: state.annotations.map(a =>
          a.id === operation.annotationId ? { ...a, ...operation.beforeState } : a
        )
      }));
    }

    set({ historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;

    const nextIndex = historyIndex + 1;
    const operation = history[nextIndex];

    if (operation.type === 'draw') {
      useExperimentStore.setState((state) => ({
        annotations: [...state.annotations, operation.afterState as Annotation]
      }));
    } else if (operation.type === 'delete') {
      useExperimentStore.setState((state) => ({
        annotations: state.annotations.filter(a => a.id !== operation.annotationId)
      }));
    } else if (operation.type === 'modify') {
      useExperimentStore.setState((state) => ({
        annotations: state.annotations.map(a =>
          a.id === operation.annotationId ? { ...a, ...operation.afterState } : a
        )
      }));
    }

    set({ historyIndex: nextIndex });
  },

  clearHistory: () => set({ history: [], historyIndex: -1 }),
  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1
}));

interface ExperimentState {
  levels: Level[];
  currentLevelId: string | null;
  annotations: Annotation[];
  currentTool: ToolType;
  selectedColor: string;
  currentPoints: Point[];
  isDrawing: boolean;
  boundaryFailed: boolean;
  boundaryFailAnimation: boolean;
  results: ExperimentResult[];
  
  setCurrentLevel: (levelId: string) => void;
  setCurrentTool: (tool: ToolType) => void;
  setSelectedColor: (color: string) => void;
  startDrawing: () => void;
  addPoint: (point: Point) => void;
  finishDrawing: (type: 'curve' | 'region', note: string, sourceMaterial: string) => void;
  cancelDrawing: () => void;
  setBoundaryFailed: (failed: boolean) => void;
  setBoundaryFailAnimation: (show: boolean) => void;
  resetLevel: () => void;
  addResult: (result: ExperimentResult) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  clearAll: () => void;
}

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set, get) => ({
      levels: LEVELS,
      currentLevelId: null,
      annotations: [],
      currentTool: 'draw',
      selectedColor: '#2DD4BF',
      currentPoints: [],
      isDrawing: false,
      boundaryFailed: false,
      boundaryFailAnimation: false,
      results: [],

      setCurrentLevel: (levelId) => {
        set({ 
          currentLevelId: levelId,
          annotations: [],
          currentPoints: [],
          boundaryFailed: false,
          boundaryFailAnimation: false
        });
        useHistoryStore.getState().clearHistory();
      },

      setCurrentTool: (tool) => set({ currentTool: tool }),
      setSelectedColor: (color) => set({ selectedColor: color }),
      startDrawing: () => set({ isDrawing: true, currentPoints: [] }),
      
      addPoint: (point) => {
        const { currentPoints, isDrawing } = get();
        if (isDrawing) {
          set({ currentPoints: [...currentPoints, point] });
        }
      },

      finishDrawing: (type, note, sourceMaterial) => {
        const { currentPoints, currentLevelId, selectedColor } = get();
        if (currentPoints.length < 2 || !currentLevelId) return;

        const newAnnotation: Annotation = {
          id: generateId(),
          levelId: currentLevelId,
          type,
          color: selectedColor,
          points: [...currentPoints],
          status: 'valid',
          note,
          sourceMaterial,
          issues: []
        };

        const operation: Operation = {
          id: generateId(),
          type: 'draw',
          annotationId: newAnnotation.id,
          beforeState: {},
          afterState: { ...newAnnotation },
          timestamp: Date.now()
        };

        set((state) => ({
          annotations: [...state.annotations, newAnnotation],
          currentPoints: [],
          isDrawing: false
        }));

        useHistoryStore.getState().pushHistory(operation);
      },

      cancelDrawing: () => set({ currentPoints: [], isDrawing: false }),
      setBoundaryFailed: (failed) => set({ boundaryFailed: failed }),
      setBoundaryFailAnimation: (show) => set({ boundaryFailAnimation: show }),

      resetLevel: () => {
        set({
          annotations: [],
          currentPoints: [],
          isDrawing: false,
          boundaryFailed: false,
          boundaryFailAnimation: false
        });
        useHistoryStore.getState().clearHistory();
      },

      addResult: (result) => {
        set((state) => ({
          results: [...state.results, result],
          levels: state.levels.map(l =>
            l.id === result.levelId ? { ...l, status: result.passed ? 'completed' : 'failed' } : l
          )
        }));
      },

      updateAnnotation: (id, updates) => {
        const annotation = get().annotations.find(a => a.id === id);
        if (!annotation) return;

        const beforeState = { ...annotation };
        
        const operation: Operation = {
          id: generateId(),
          type: 'modify',
          annotationId: id,
          beforeState,
          afterState: updates,
          timestamp: Date.now()
        };

        set((state) => ({
          annotations: state.annotations.map(a =>
            a.id === id ? { ...a, ...updates } : a
          )
        }));

        useHistoryStore.getState().pushHistory(operation);
      },

      deleteAnnotation: (id) => {
        const annotation = get().annotations.find(a => a.id === id);
        if (!annotation) return;

        const operation: Operation = {
          id: generateId(),
          type: 'delete',
          annotationId: id,
          beforeState: { ...annotation },
          afterState: {},
          timestamp: Date.now()
        };

        set((state) => ({
          annotations: state.annotations.filter(a => a.id !== id)
        }));

        useHistoryStore.getState().pushHistory(operation);
      },

      clearAll: () => {
        set({
          annotations: [],
          currentPoints: [],
          isDrawing: false,
          boundaryFailed: false,
          boundaryFailAnimation: false
        });
        useHistoryStore.getState().clearHistory();
      }
    }),
    {
      name: 'experiment-storage',
      partialize: (state) => ({
        levels: state.levels,
        results: state.results
      })
    }
  )
);
