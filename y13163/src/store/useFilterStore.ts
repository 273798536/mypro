import { create } from 'zustand';
import type { FilterState, AnomalyType, DataStatus } from '@/types';

interface FilterStore extends FilterState {
  setDateRange: (range: [string, string] | null) => void;
  toggleAnomalyType: (type: AnomalyType) => void;
  setAnomalyTypes: (types: AnomalyType[]) => void;
  toggleStatus: (status: DataStatus) => void;
  setStatuses: (statuses: DataStatus[]) => void;
  setShowNoiseOnly: (show: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  dateRange: null,
  anomalyTypes: [],
  statuses: [],
  showNoiseOnly: false,
  searchKeyword: '',
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  setDateRange: (range) => set({ dateRange: range }),

  toggleAnomalyType: (type) =>
    set((state) => ({
      anomalyTypes: state.anomalyTypes.includes(type)
        ? state.anomalyTypes.filter((t) => t !== type)
        : [...state.anomalyTypes, type],
    })),

  setAnomalyTypes: (types) => set({ anomalyTypes: types }),

  toggleStatus: (status) =>
    set((state) => ({
      statuses: state.statuses.includes(status)
        ? state.statuses.filter((s) => s !== status)
        : [...state.statuses, status],
    })),

  setStatuses: (statuses) => set({ statuses }),

  setShowNoiseOnly: (show) => set({ showNoiseOnly: show }),

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  resetFilters: () => set(initialState),
}));
