import { create } from 'zustand';
import type { AppFilters, StatusFilter } from '@/types';

interface AppState {
  filters: AppFilters;
  selectedRecordId: string | null;
  selectedPointId: string | null;
  unitWarningExpanded: boolean;
  csvModalOpen: boolean;
  helpExpanded: boolean;

  setFilters: (f: Partial<AppFilters>) => void;
  setStatusFilter: (s: StatusFilter) => void;
  selectRecord: (id: string | null) => void;
  selectPoint: (id: string | null) => void;
  toggleUnitWarning: () => void;
  toggleCsvModal: () => void;
  toggleHelp: () => void;
  resetToDemo: () => void;
}

const defaultFilters: AppFilters = {
  station: 'A03',
  dateFrom: '2025-06-09',
  dateTo: '2025-06-09',
  statusFilter: 'all',
};

export const useAppStore = create<AppState>((set) => ({
  filters: defaultFilters,
  selectedRecordId: null,
  selectedPointId: null,
  unitWarningExpanded: false,
  csvModalOpen: false,
  helpExpanded: false,

  setFilters: (f) =>
    set((state) => ({ filters: { ...state.filters, ...f } })),

  setStatusFilter: (s) =>
    set((state) => ({ filters: { ...state.filters, statusFilter: s } })),

  selectRecord: (id) => set({ selectedRecordId: id }),

  selectPoint: (id) => set({ selectedPointId: id }),

  toggleUnitWarning: () =>
    set((state) => ({ unitWarningExpanded: !state.unitWarningExpanded })),

  toggleCsvModal: () =>
    set((state) => ({ csvModalOpen: !state.csvModalOpen })),

  toggleHelp: () =>
    set((state) => ({ helpExpanded: !state.helpExpanded })),

  resetToDemo: () =>
    set({
      filters: defaultFilters,
      selectedRecordId: null,
      selectedPointId: null,
    }),
}));
