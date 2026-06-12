import { create } from 'zustand';
import type { RiskLevel, DataStatus, SamplePoint } from '@/types';
import { useMissionStore } from './missionStore';

interface FilterState {
  riskLevels: RiskLevel[];
  statuses: DataStatus[];
  searchQuery: string;
  toggleRiskLevel: (level: RiskLevel) => void;
  toggleStatus: (status: DataStatus) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  getFilteredPoints: () => SamplePoint[];
}

export const useFilterStore = create<FilterState>((set, get) => ({
  riskLevels: ['safe', 'warning', 'danger'],
  statuses: ['approved', 'pending', 'delayed', 'recollect'],
  searchQuery: '',
  toggleRiskLevel: (level: RiskLevel) =>
    set((state) => {
      const has = state.riskLevels.includes(level);
      const next = has ? state.riskLevels.filter((l) => l !== level) : [...state.riskLevels, level];
      return { riskLevels: next.length === 0 ? ['safe', 'warning', 'danger'] : next };
    }),
  toggleStatus: (status: DataStatus) =>
    set((state) => {
      const has = state.statuses.includes(status);
      const next = has ? state.statuses.filter((s) => s !== status) : [...state.statuses, status];
      return { statuses: next.length === 0 ? ['approved', 'pending', 'delayed', 'recollect'] : next };
    }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  resetFilters: () =>
    set({ riskLevels: ['safe', 'warning', 'danger'], statuses: ['approved', 'pending', 'delayed', 'recollect'], searchQuery: '' }),
  getFilteredPoints: () => {
    const { riskLevels, statuses, searchQuery } = get();
    const { currentMission } = useMissionStore.getState();
    if (!currentMission) return [];
    return currentMission.samplePoints.filter((p) => {
      if (!riskLevels.includes(p.riskLevel)) return false;
      if (!statuses.includes(p.status)) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  },
}));
