import { create } from 'zustand';
import type { FilterState, AnomalyType, DataStatus, AnomalyStatus } from '@/types';

interface FilterStore extends FilterState {
  setDateRange: (range: [string, string] | null) => void;
  toggleAnomalyType: (type: AnomalyType) => void;
  setAnomalyTypes: (types: AnomalyType[]) => void;
  toggleStatus: (status: DataStatus) => void;
  setStatuses: (statuses: DataStatus[]) => void;
  toggleAnomalyStatus: (status: AnomalyStatus) => void;
  setAnomalyStatuses: (statuses: AnomalyStatus[]) => void;
  setShowNoiseOnly: (show: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  dateRange: null,
  anomalyTypes: [],
  statuses: [],
  anomalyStatuses: [],
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

  toggleAnomalyStatus: (status) =>
    set((state) => ({
      anomalyStatuses: state.anomalyStatuses.includes(status)
        ? state.anomalyStatuses.filter((s) => s !== status)
        : [...state.anomalyStatuses, status],
    })),

  setAnomalyStatuses: (statuses) => set({ anomalyStatuses: statuses }),

  setShowNoiseOnly: (show) => set({ showNoiseOnly: show }),

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  resetFilters: () => set(initialState),
}));
