import { create } from 'zustand';
import type { DeliveryRecord, HistoryRecord, FilterCriteria, ExportOptions } from '@shared/types';

interface AppState {
  records: DeliveryRecord[];
  selectedRecord: DeliveryRecord | null;
  history: HistoryRecord[];
  filters: FilterCriteria;
  exportOptions: ExportOptions;
  loading: boolean;
  error: string | null;
  activeTab: string;

  setRecords: (records: DeliveryRecord[]) => void;
  setSelectedRecord: (record: DeliveryRecord | null) => void;
  setHistory: (history: HistoryRecord[]) => void;
  setFilters: (filters: Partial<FilterCriteria>) => void;
  setExportOptions: (options: Partial<ExportOptions>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: string) => void;
  resetFilters: () => void;
}

export const useStore = create<AppState>((set) => ({
  records: [],
  selectedRecord: null,
  history: [],
  filters: {},
  exportOptions: {
    includeRawData: true,
    includeIssues: true,
    includeHistory: false,
    filterNote: '',
  },
  loading: false,
  error: null,
  activeTab: 'import',

  setRecords: (records) => set({ records }),
  setSelectedRecord: (record) => set({ selectedRecord: record }),
  setHistory: (history) => set({ history }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setExportOptions: (options) => set((state) => ({ exportOptions: { ...state.exportOptions, ...options } })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActiveTab: (activeTab) => set({ activeTab }),
  resetFilters: () => set({ filters: {} }),
}));
