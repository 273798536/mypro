import { create } from 'zustand';
import type { FilterState } from '@/types';

interface FilterStore extends FilterState {
  setSelectedSlopes: (slopes: string[]) => void;
  setSlopeRange: (range: [number, number]) => void;
  setSnowDepthRange: (range: [number, number]) => void;
  setTimeRange: (range: [Date, Date]) => void;
  setRiskLevels: (levels: FilterState['riskLevels']) => void;
  setShowHeatmap: (show: boolean) => void;
  setHeatmapOpacity: (opacity: number) => void;
  setShowSlopeColors: (show: boolean) => void;
  setShowRiskMarkers: (show: boolean) => void;
  resetFilters: () => void;
}

const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

const defaultState: FilterState = {
  selectedSlopes: [],
  slopeRange: [0, 45],
  snowDepthRange: [0, 100],
  timeRange: [startOfDay, endOfDay],
  riskLevels: ['low', 'medium', 'high', 'critical'],
  showHeatmap: true,
  heatmapOpacity: 0.6,
  showSlopeColors: true,
  showRiskMarkers: true,
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...defaultState,

  setSelectedSlopes: (slopes) => set({ selectedSlopes: slopes }),
  setSlopeRange: (range) => set({ slopeRange: range }),
  setSnowDepthRange: (range) => set({ snowDepthRange: range }),
  setTimeRange: (range) => set({ timeRange: range }),
  setRiskLevels: (levels) => set({ riskLevels: levels }),
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  setHeatmapOpacity: (opacity) => set({ heatmapOpacity: opacity }),
  setShowSlopeColors: (show) => set({ showSlopeColors: show }),
  setShowRiskMarkers: (show) => set({ showRiskMarkers: show }),
  resetFilters: () => set(defaultState),
}));
