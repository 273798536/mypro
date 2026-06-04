import { create } from 'zustand';
import { LEVELS, getLevelById } from '../data/levels';
import type { Level, LevelProgress, LevelType } from '../types/level';

interface LevelState {
  levels: Level[];
  currentLevelId: string | null;
  completedLevels: Record<string, LevelProgress>;
  readonly currentLevel: Level | undefined;
}

interface LevelActions {
  setCurrentLevel: (levelId: string) => void;
  completeLevel: (levelId: string, annotationCount: number, anomalyCount: number) => void;
  getCurrentLevel: () => Level | undefined;
  getLevelById: (id: string) => Level | undefined;
  getLevelProgress: (levelId: string) => LevelProgress | undefined;
  getLevelsByType: (type: LevelType) => Level | undefined;
  resetLevelProgress: (levelId: string) => void;
}

export type LevelStore = LevelState & LevelActions;

export const useLevelStore = create<LevelStore>((set, get) => ({
  levels: LEVELS,
  currentLevelId: null,
  completedLevels: {},

  get currentLevel() {
    const { currentLevelId, levels } = get();
    return currentLevelId ? levels.find(l => l.id === currentLevelId) : undefined;
  },

  setCurrentLevel: (levelId) => set({ currentLevelId: levelId }),

  completeLevel: (levelId, annotationCount, anomalyCount) => {
    set((state) => ({
      completedLevels: {
        ...state.completedLevels,
        [levelId]: {
          levelId,
          completed: true,
          annotationCount,
          anomalyCount,
          completedAt: Date.now(),
        },
      },
    }));
  },

  getCurrentLevel: () => {
    const { currentLevelId, levels } = get();
    return currentLevelId ? levels.find(l => l.id === currentLevelId) : undefined;
  },

  getLevelById: (id) => getLevelById(id),

  getLevelProgress: (levelId) => get().completedLevels[levelId],

  getLevelsByType: (type) => get().levels.find(l => l.type === type),

  resetLevelProgress: (levelId) => {
    set((state) => {
      const { [levelId]: _, ...rest } = state.completedLevels;
      return { completedLevels: rest };
    });
  },
}));
