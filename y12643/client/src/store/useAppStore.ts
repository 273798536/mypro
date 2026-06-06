import { create } from 'zustand';
import {
  Layer,
  ExceptionRecord,
  ProcessingRecord,
  FilterCriteria,
  ExportSummary,
  CanvasOverview,
  ReviewResponse,
  RecordStatus,
  ExceptionType,
  RecordType
} from '@/types';
import { layerApi, exceptionApi, canvasApi, reviewApi, consistencyApi } from '@/services/api';
import { ConsistencyResult } from '@/types';

interface AppState {
  layers: Layer[];
  exceptions: ExceptionRecord[];
  exceptionSummary: ExportSummary | null;
  currentException: ExceptionRecord | null;
  processingHistory: ProcessingRecord[];
  canvasOverview: CanvasOverview | null;
  reviewData: ReviewResponse | null;
  consistencyResult: ConsistencyResult | null;
  filters: FilterCriteria;
  selectedIds: string[];
  loading: {
    layers: boolean;
    exceptions: boolean;
    detail: boolean;
    overview: boolean;
    review: boolean;
    processing: boolean;
  };
  error: string | null;

  setFilters: (filters: Partial<FilterCriteria>) => void;
  resetFilters: () => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  selectAll: (ids: string[]) => void;

  fetchLayers: () => Promise<void>;
  fetchExceptions: (filters?: FilterCriteria) => Promise<void>;
  fetchExceptionDetail: (id: string) => Promise<void>;
  fetchProcessingHistory: (id: string) => Promise<void>;
  fetchCanvasOverview: () => Promise<void>;
  fetchReviewData: () => Promise<void>;
  fetchConsistencyCheck: () => Promise<void>;

  importRecords: (records: any[]) => Promise<any>;
  updateExceptionStatus: (id: string, status: RecordStatus) => Promise<void>;
  addProcessingRecord: (
    id: string,
    data: {
      action: string;
      operator: string;
      opinion: string;
      previousStatus: RecordStatus;
      newStatus: RecordStatus;
    }
  ) => Promise<void>;
  batchReview: (
    ids: string[],
    conclusion: RecordStatus,
    comment: string,
    reviewer: string
  ) => Promise<void>;
  exportReport: (format: 'csv' | 'json') => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  layers: [],
  exceptions: [],
  exceptionSummary: null,
  currentException: null,
  processingHistory: [],
  canvasOverview: null,
  reviewData: null,
  consistencyResult: null,
  filters: {
    status: [],
    type: [],
    recordType: []
  },
  selectedIds: [],
  loading: {
    layers: false,
    exceptions: false,
    detail: false,
    overview: false,
    review: false,
    processing: false
  },
  error: null,

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  resetFilters: () => {
    set({
      filters: { status: [], type: [], recordType: [] },
      selectedIds: []
    });
  },

  toggleSelected: (id) => {
    set(state => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter(i => i !== id)
        : [...state.selectedIds, id]
    }));
  },

  clearSelected: () => {
    set({ selectedIds: [] });
  },

  selectAll: (ids) => {
    set({ selectedIds: ids });
  },

  fetchLayers: async () => {
    set({ loading: { ...get().loading, layers: true } });
    try {
      const data = await layerApi.list();
      set({ layers: data, error: null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: { ...get().loading, layers: false } });
    }
  },

  fetchExceptions: async (filters) => {
    set({ loading: { ...get().loading, exceptions: true } });
    try {
      const finalFilters = filters || get().filters;
      const data = await exceptionApi.list(finalFilters);
      set({
        exceptions: data.records,
        exceptionSummary: data.summary,
        error: null
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: { ...get().loading, exceptions: false } });
    }
  },

  fetchExceptionDetail: async (id) => {
    set({ loading: { ...get().loading, detail: true } });
    try {
      const data = await exceptionApi.get(id);
      set({ currentException: data, error: null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: { ...get().loading, detail: false } });
    }
  },

  fetchProcessingHistory: async (id) => {
    set({ loading: { ...get().loading, processing: true } });
    try {
      const data = await exceptionApi.getProcessingHistory(id);
      set({ processingHistory: data, error: null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: { ...get().loading, processing: false } });
    }
  },

  fetchCanvasOverview: async () => {
    set({ loading: { ...get().loading, overview: true } });
    try {
      const data = await canvasApi.overview();
      set({ canvasOverview: data, error: null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: { ...get().loading, overview: false } });
    }
  },

  fetchReviewData: async () => {
    set({ loading: { ...get().loading, review: true } });
    try {
      const data = await reviewApi.list();
      set({ reviewData: data, error: null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: { ...get().loading, review: false } });
    }
  },

  fetchConsistencyCheck: async () => {
    try {
      const data = await consistencyApi.check();
      set({ consistencyResult: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  importRecords: async (records) => {
    try {
      const result = await exceptionApi.create(records);
      await get().fetchExceptions();
      await get().fetchLayers();
      return result;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateExceptionStatus: async (id, status) => {
    try {
      await exceptionApi.update(id, { status });
      await get().fetchExceptions();
      await get().fetchExceptionDetail(id);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addProcessingRecord: async (id, data) => {
    try {
      await exceptionApi.addProcessingRecord(id, data);
      await get().fetchExceptionDetail(id);
      await get().fetchProcessingHistory(id);
      await get().fetchExceptions();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  batchReview: async (ids, conclusion, comment, reviewer) => {
    try {
      await reviewApi.batchReview({ ids, conclusion, comment, reviewer });
      await get().fetchReviewData();
      await get().fetchExceptions();
      set({ selectedIds: [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  exportReport: async (format) => {
    try {
      const blob = await reviewApi.export(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `平面机构运动演示_复核报告_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
