import { create } from 'zustand';
import { CashFlowRecord, FilterState, Anomaly, AppState } from '../types';
import { mockCashFlowData } from '../data/mockData';
import { detectAnomalies } from '../utils/anomalyDetector';
import { filterRecords, getDateRange } from '../utils/dataTransformer';

interface CashFlowStore extends AppState {
  anomalies: Anomaly[];
  filteredRecords: CashFlowRecord[];

  setFilters: (filters: Partial<FilterState>) => void;
  toggleCurrency: (currency: string) => void;
  selectAllCurrencies: () => void;
  clearAllCurrencies: () => void;
  setRiskRange: (range: [number, number]) => void;
  setDateRange: (range: [string, string]) => void;
  selectRecord: (id: string | null) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  toggleCorrections: () => void;
  getRecordById: (id: string) => CashFlowRecord | undefined;
}

const allCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
const initialDateRange = getDateRange(mockCashFlowData);

export const useCashFlowStore = create<CashFlowStore>((set, get) => ({
  records: mockCashFlowData,
  anomalies: detectAnomalies(mockCashFlowData),
  filteredRecords: mockCashFlowData,
  filters: {
    selectedCurrencies: allCurrencies,
    riskRange: [1, 5],
    dateRange: initialDateRange,
  },
  selectedRecordId: null,
  viewMode: 'terrain',
  showCorrections: false,

  setFilters: (newFilters) => {
    const current = get().filters;
    const updated = { ...current, ...newFilters };
    const filtered = filterRecords(get().records, updated);
    set({ filters: updated, filteredRecords: filtered });
  },

  toggleCurrency: (currency) => {
    const current = get().filters.selectedCurrencies;
    const updated = current.includes(currency)
      ? current.filter(c => c !== currency)
      : [...current, currency];
    const newFilters = { ...get().filters, selectedCurrencies: updated };
    const filtered = filterRecords(get().records, newFilters);
    set({ filters: newFilters, filteredRecords: filtered });
  },

  selectAllCurrencies: () => {
    const newFilters = { ...get().filters, selectedCurrencies: allCurrencies };
    const filtered = filterRecords(get().records, newFilters);
    set({ filters: newFilters, filteredRecords: filtered });
  },

  clearAllCurrencies: () => {
    const newFilters = { ...get().filters, selectedCurrencies: [] };
    const filtered = filterRecords(get().records, newFilters);
    set({ filters: newFilters, filteredRecords: filtered });
  },

  setRiskRange: (range) => {
    const newFilters = { ...get().filters, riskRange: range };
    const filtered = filterRecords(get().records, newFilters);
    set({ filters: newFilters, filteredRecords: filtered });
  },

  setDateRange: (range) => {
    const newFilters = { ...get().filters, dateRange: range };
    const filtered = filterRecords(get().records, newFilters);
    set({ filters: newFilters, filteredRecords: filtered });
  },

  selectRecord: (id) => {
    set({ selectedRecordId: id });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  toggleCorrections: () => {
    set({ showCorrections: !get().showCorrections });
  },

  getRecordById: (id) => {
    return get().records.find(r => r.id === id);
  },
}));