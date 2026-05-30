import { create } from 'zustand';
import { yards } from '../data/yards';
import { cranes } from '../data/cranes';
import { truckRoutes } from '../data/routes';
import { detectConflicts, calculateCoverageRate } from '../utils/conflictDetector';
import type { Conflict, ParamChange } from '../types';

interface SandboxState {
  currentYardId: string;
  craneRadius: number;
  minHeightFilter: number;
  maxHeightFilter: number;
  currentTime: number;
  isPlaying: boolean;
  showReport: boolean;
  conflicts: Conflict[];
  changeHistory: ParamChange[];
  coverageRate: number;

  setCurrentYardId: (id: string) => void;
  setCraneRadius: (radius: number) => void;
  setHeightFilter: (min: number, max: number) => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  setShowReport: (show: boolean) => void;
  updateConflictStatus: (id: string, status: Conflict['status']) => void;
  assignConflict: (id: string, assignee: string) => void;
  recordChange: (change: Omit<ParamChange, 'id' | 'timestamp'>) => void;
}

export const useSandboxStore = create<SandboxState>((set, get) => {
  const initialYard = yards[0];
  const initialConflicts = detectConflicts(initialYard, cranes, truckRoutes, 35);
  const initialCoverage = calculateCoverageRate(initialYard, cranes, 35);

  return {
    currentYardId: 'yard-a',
    craneRadius: 35,
    minHeightFilter: 0,
    maxHeightFilter: 15,
    currentTime: 0,
    isPlaying: false,
    showReport: false,
    conflicts: initialConflicts,
    changeHistory: [],
    coverageRate: initialCoverage,

    setCurrentYardId: (id) => {
      const oldId = get().currentYardId;
      const yard = yards.find(y => y.id === id);
      if (yard) {
        const newConflicts = detectConflicts(yard, cranes, truckRoutes, get().craneRadius);
        const newCoverage = calculateCoverageRate(yard, cranes, get().craneRadius);
        set({
          currentYardId: id,
          conflicts: newConflicts,
          coverageRate: newCoverage,
        });
        get().recordChange({
          paramName: '堆场模型',
          oldValue: yards.find(y => y.id === oldId)?.name || oldId,
          newValue: yard.name,
          user: '当前用户',
          description: '切换堆场模型',
        });
      }
    },

    setCraneRadius: (radius) => {
      const oldRadius = get().craneRadius;
      const yard = yards.find(y => y.id === get().currentYardId);
      if (yard) {
        const newConflicts = detectConflicts(yard, cranes, truckRoutes, radius);
        const newCoverage = calculateCoverageRate(yard, cranes, radius);
        set({
          craneRadius: radius,
          conflicts: newConflicts,
          coverageRate: newCoverage,
        });
        get().recordChange({
          paramName: '吊机半径',
          oldValue: `${oldRadius}m`,
          newValue: `${radius}m`,
          user: '当前用户',
          description: '调整吊机作业半径',
        });
      }
    },

    setHeightFilter: (min, max) => {
      const oldMin = get().minHeightFilter;
      const oldMax = get().maxHeightFilter;
      set({ minHeightFilter: min, maxHeightFilter: max });
      if (min !== oldMin || max !== oldMax) {
        get().recordChange({
          paramName: '箱区高度筛选',
          oldValue: `${oldMin}-${oldMax}m`,
          newValue: `${min}-${max}m`,
          user: '当前用户',
          description: '调整箱区高度筛选范围',
        });
      }
    },

    setCurrentTime: (time) => set({ currentTime: time }),

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setShowReport: (show) => set({ showReport: show }),

    updateConflictStatus: (id, status) => {
      set((state) => ({
        conflicts: state.conflicts.map((c) =>
          c.id === id ? { ...c, status } : c
        ),
      }));
    },

    assignConflict: (id, assignee) => {
      set((state) => ({
        conflicts: state.conflicts.map((c) =>
          c.id === id ? { ...c, assignee } : c
        ),
      }));
    },

    recordChange: (change) => {
      set((state) => ({
        changeHistory: [
          {
            ...change,
            id: `change-${Date.now()}`,
            timestamp: Date.now(),
          },
          ...state.changeHistory,
        ],
      }));
    },
  };
});

export { yards, cranes, truckRoutes };
