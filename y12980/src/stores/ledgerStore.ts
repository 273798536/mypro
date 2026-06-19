import { create } from 'zustand';
import type { LedgerRecord, RecordStatus, AnomalyType, PaginatedResponse } from '../../shared/types.js';
import { ledgerApi } from '../services/api.js';

interface LedgerState {
  records: LedgerRecord[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  filters: {
    status?: RecordStatus;
    anomalyType?: AnomalyType;
    sourceFile?: string;
    startDate?: string;
    endDate?: string;
  };
  statusCounts: Record<RecordStatus, number>;
  selectedRecord: LedgerRecord | null;
  fetchRecords: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  fetchRecordById: (id: string) => Promise<LedgerRecord | null>;
  updateRecord: (id: string, updates: Partial<LedgerRecord>) => Promise<void>;
  fetchStatusCounts: () => Promise<void>;
  setFilters: (filters: Partial<LedgerState['filters']>) => void;
  clearFilters: () => void;
  setSelectedRecord: (record: LedgerRecord | null) => void;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  records: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
  filters: {},
  statusCounts: { AVAILABLE: 0, NEEDS_REVIEW: 0, UNAVAILABLE: 0 },
  selectedRecord: null,

  fetchRecords: async (params) => {
    set({ loading: true, error: null });
    try {
      const currentState = get();
      const result: PaginatedResponse<LedgerRecord> = await ledgerApi.getList({
        page: params?.page || currentState.page,
        pageSize: params?.pageSize || currentState.pageSize,
        ...currentState.filters,
      });
      set({
        records: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        loading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch records', loading: false });
    }
  },

  fetchRecordById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const record = await ledgerApi.getById(id);
      set({ selectedRecord: record, loading: false });
      return record;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch record', loading: false });
      return null;
    }
  },

  updateRecord: async (id: string, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await ledgerApi.update(id, updates);
      set(state => ({
        records: state.records.map(r => r.id === id ? updated : r),
        selectedRecord: state.selectedRecord?.id === id ? updated : state.selectedRecord,
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update record', loading: false });
    }
  },

  fetchStatusCounts: async () => {
    try {
      const counts = await ledgerApi.getStatusCounts();
      set({ statusCounts: counts as Record<RecordStatus, number> });
    } catch (error) {
      console.error('Failed to fetch status counts:', error);
    }
  },

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    }));
  },

  clearFilters: () => {
    set({ filters: {}, page: 1 });
  },

  setSelectedRecord: (record) => {
    set({ selectedRecord: record });
  },
}));
