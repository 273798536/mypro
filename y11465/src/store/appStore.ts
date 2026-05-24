import { create } from 'zustand';
import api from '../services/api';
import { Document, AuditLog } from '../../shared/types';

interface Batch {
  id: string;
  batchNo: string;
  styleCode: string;
  brand: string;
  status: string;
  frozen: boolean;
  frozenReason?: string;
  createdBy: string;
  createdAt: string;
}

interface Task {
  id: string;
  type: string;
  status: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
}

interface Report {
  id: string;
  batchId: string;
  type: string;
  generatedBy: string;
  createdAt: string;
}

interface AppState {
  batches: Batch[];
  documents: Document[];
  tasks: Task[];
  reports: Report[];
  auditLogs: AuditLog[];
  batchStats: { total: number; pendingReview: number; frozen: number; settled: number };
  taskStats: { total: number; pending: number; waitingRetry: number; waitingManual: number; failed: number; success: number };
  loading: boolean;
  error: string | null;
  
  fetchBatchStats: () => Promise<void>;
  fetchTaskStats: () => Promise<void>;
  fetchBatches: (params?: Record<string, string>) => Promise<void>;
  fetchDocuments: (params?: Record<string, string>) => Promise<void>;
  fetchPendingReview: () => Promise<void>;
  fetchTasks: (params?: Record<string, string>) => Promise<void>;
  fetchReports: (params?: Record<string, string>) => Promise<void>;
  fetchAuditLogs: (params?: Record<string, string>) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  batches: [],
  documents: [],
  tasks: [],
  reports: [],
  auditLogs: [],
  batchStats: { total: 0, pendingReview: 0, frozen: 0, settled: 0 },
  taskStats: { total: 0, pending: 0, waitingRetry: 0, waitingManual: 0, failed: 0, success: 0 },
  loading: false,
  error: null,

  fetchBatchStats: async () => {
    try {
      const stats = await api.batches.stats();
      set({ batchStats: stats });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchTaskStats: async () => {
    try {
      const stats = await api.tasks.stats();
      set({ taskStats: stats });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchBatches: async (params?: Record<string, string>) => {
    set({ loading: true });
    try {
      const result: any = await api.batches.list(params);
      set({ batches: result.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchDocuments: async (params?: Record<string, string>) => {
    set({ loading: true });
    try {
      const result: any = await api.documents.list(params);
      set({ documents: result.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchPendingReview: async () => {
    set({ loading: true });
    try {
      const result: any = await api.review.pending();
      set({ documents: result.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchTasks: async (params?: Record<string, string>) => {
    set({ loading: true });
    try {
      const result: any = await api.tasks.list(params);
      set({ tasks: result.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchReports: async (params?: Record<string, string>) => {
    set({ loading: true });
    try {
      const result: any = await api.reports.list(params);
      set({ reports: result.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAuditLogs: async (params?: Record<string, string>) => {
    set({ loading: true });
    try {
      const result: any = await api.audit.list(params);
      set({ auditLogs: result.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));
