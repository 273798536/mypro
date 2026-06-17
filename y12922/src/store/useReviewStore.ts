import { create } from 'zustand';
import type {
  DashboardSummary,
  Batch,
  BatchStatus,
  ImportRequest,
  ImportResponse,
  BatchDetail,
  Anomaly,
  AnomalyType,
  AnomalyStatus,
  OpinionAction,
  ReportRecord,
  ComparisonResult,
} from '@shared/types';
import * as api from '@/lib/api';

interface ReviewState {
  dashboard: DashboardSummary | null;
  batches: Batch[];
  batchDetail: BatchDetail | null;
  anomalies: Anomaly[];
  currentAnomaly: Anomaly | null;
  report: ReportRecord | null;
  comparisons: ComparisonResult[];

  loadingDashboard: boolean;
  loadingBatches: boolean;
  loadingDetail: boolean;
  loadingAnomalies: boolean;
  loadingAnomaly: boolean;
  loadingReport: boolean;
  loadingCompare: boolean;
  submitting: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchBatches: (params?: { status?: BatchStatus; q?: string }) => Promise<void>;
  importBatch: (req: ImportRequest) => Promise<ImportResponse>;
  fetchBatchDetail: (id: string) => Promise<void>;
  advanceStatus: (id: string, status: BatchStatus) => Promise<void>;
  fetchAnomalies: (
    batchId: string,
    params?: { type?: AnomalyType; status?: AnomalyStatus },
  ) => Promise<void>;
  fetchAnomaly: (id: string) => Promise<void>;
  reviewAnomaly: (
    id: string,
    body: { action?: OpinionAction; text?: string; reviewer?: string; status?: AnomalyStatus },
  ) => Promise<void>;
  generateReport: (batchId: string) => Promise<void>;
  fetchReport: (batchId: string) => Promise<void>;
  compareBatches: (batchId: string, againstBatchId: string) => Promise<void>;
  fetchComparisons: (batchId: string) => Promise<void>;
  setError: (msg: string | null) => void;
  clearError: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  dashboard: null,
  batches: [],
  batchDetail: null,
  anomalies: [],
  currentAnomaly: null,
  report: null,
  comparisons: [],

  loadingDashboard: false,
  loadingBatches: false,
  loadingDetail: false,
  loadingAnomalies: false,
  loadingAnomaly: false,
  loadingReport: false,
  loadingCompare: false,
  submitting: false,
  error: null,

  fetchDashboard: async () => {
    set({ loadingDashboard: true, error: null });
    try {
      const dashboard = await api.getDashboard();
      set({ dashboard, loadingDashboard: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingDashboard: false });
    }
  },

  fetchBatches: async (params) => {
    set({ loadingBatches: true, error: null });
    try {
      const batches = await api.listBatches(params);
      set({ batches, loadingBatches: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingBatches: false });
    }
  },

  importBatch: async (req) => {
    set({ submitting: true, error: null });
    try {
      const res = await api.importBatch(req);
      set({ submitting: false });
      return res;
    } catch (e) {
      set({ error: (e as Error).message, submitting: false });
      throw e;
    }
  },

  fetchBatchDetail: async (id) => {
    set({ loadingDetail: true, error: null, batchDetail: null });
    try {
      const batchDetail = await api.getBatchDetail(id);
      set({ batchDetail, loadingDetail: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingDetail: false });
    }
  },

  advanceStatus: async (id, status) => {
    set({ submitting: true, error: null });
    try {
      const batch = await api.advanceStatus(id, status);
      const { batchDetail, batches } = get();
      if (batchDetail?.batch.id === id) {
        set({ batchDetail: { ...batchDetail, batch } });
      }
      set({
        batches: batches.map((b) => (b.id === id ? { ...b, ...batch } : b)),
        submitting: false,
      });
      await get().fetchDashboard();
    } catch (e) {
      set({ error: (e as Error).message, submitting: false });
    }
  },

  fetchAnomalies: async (batchId, params) => {
    set({ loadingAnomalies: true, error: null });
    try {
      const anomalies = await api.listAnomalies(batchId, params);
      set({ anomalies, loadingAnomalies: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingAnomalies: false });
    }
  },

  fetchAnomaly: async (id) => {
    set({ loadingAnomaly: true, error: null });
    try {
      const currentAnomaly = await api.getAnomaly(id);
      set({ currentAnomaly, loadingAnomaly: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingAnomaly: false });
    }
  },

  reviewAnomaly: async (id, body) => {
    set({ submitting: true, error: null });
    try {
      const updated = await api.reviewAnomaly(id, body);
      const { anomalies, currentAnomaly } = get();
      set({
        anomalies: anomalies.map((a) => (a.id === id ? updated : a)),
        currentAnomaly: currentAnomaly?.id === id ? updated : currentAnomaly,
        submitting: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, submitting: false });
    }
  },

  generateReport: async (batchId) => {
    set({ loadingReport: true, error: null });
    try {
      const report = await api.generateReport(batchId);
      set({ report, loadingReport: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingReport: false });
    }
  },

  fetchReport: async (batchId) => {
    set({ loadingReport: true, error: null });
    try {
      const report = await api.getReport(batchId);
      set({ report, loadingReport: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingReport: false });
    }
  },

  compareBatches: async (batchId, againstBatchId) => {
    set({ loadingCompare: true, error: null });
    try {
      await api.compareBatches(batchId, againstBatchId);
      set({ loadingCompare: false });
      await get().fetchComparisons(batchId);
    } catch (e) {
      set({ error: (e as Error).message, loadingCompare: false });
    }
  },

  fetchComparisons: async (batchId) => {
    set({ loadingCompare: true, error: null });
    try {
      const comparisons = await api.listComparisons(batchId);
      set({ comparisons, loadingCompare: false });
    } catch (e) {
      set({ error: (e as Error).message, loadingCompare: false });
    }
  },

  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),
}));
