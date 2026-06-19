import { create } from 'zustand';
import {
  DiagnosisBatch,
  DiagnosisResult,
  AuditLog,
  DataDictionary,
  PermissionRequest,
  BoundaryCase,
  VersionComparison,
  DictionaryComparison
} from '../../shared/types';

interface StoreState {
  currentUser: { id: string; name: string; role: string };
  batches: DiagnosisBatch[];
  currentBatch: DiagnosisBatch | null;
  currentResults: DiagnosisResult[];
  auditLogs: AuditLog[];
  auditTotal: number;
  dictionary: DataDictionary[];
  permissionRequests: PermissionRequest[];
  boundaryCases: BoundaryCase[];
  versionComparison: VersionComparison | null;
  dictionaryComparison: DictionaryComparison | null;
  loading: boolean;
  error: string | null;
  
  setCurrentUser: (user: { id: string; name: string; role: string }) => void;
  fetchBatches: () => Promise<void>;
  fetchBatchResults: (batchId: string) => Promise<void>;
  importData: (data: any[], reason?: string) => Promise<any>;
  runDiagnosis: (batchId: string) => Promise<void>;
  confirmDiagnosis: (batchId: string, reason?: string) => Promise<void>;
  fetchAuditLogs: (options?: any) => Promise<void>;
  rollbackBatch: (batchId: string, reason: string) => Promise<void>;
  compareBatches: (id1: string, id2: string) => Promise<void>;
  fetchDictionary: () => Promise<void>;
  updateDictionary: (id: string, value: string, reason: string) => Promise<void>;
  fetchDictionaryComparison: (id: string) => Promise<void>;
  fetchPermissionRequests: () => Promise<void>;
  createPermissionRequest: (permission: string, reason: string) => Promise<void>;
  approvePermission: (id: string) => Promise<void>;
  rejectPermission: (id: string, reason: string) => Promise<void>;
  fetchBoundaryCases: () => Promise<void>;
  runBoundaryCase: (caseId: string) => Promise<any>;
  runAllBoundaryCases: () => Promise<any>;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  currentUser: { id: 'u002', name: '李华', role: 'sre_reviewer' },
  batches: [],
  currentBatch: null,
  currentResults: [],
  auditLogs: [],
  auditTotal: 0,
  dictionary: [],
  permissionRequests: [],
  boundaryCases: [],
  versionComparison: null,
  dictionaryComparison: null,
  loading: false,
  error: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  fetchBatches: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/diagnosis/batches');
      const data = await res.json();
      if (data.success) {
        set({ batches: data.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchBatchResults: async (batchId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/diagnosis/${batchId}`);
      const data = await res.json();
      if (data.success) {
        set({ 
          currentBatch: data.data.batch, 
          currentResults: data.data.results 
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  importData: async (data, reason) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/diagnosis/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, reason })
      });
      const result = await res.json();
      if (result.success) {
        await get().fetchBatches();
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  runDiagnosis: async (batchId: string) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/diagnosis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchBatchResults(batchId);
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  confirmDiagnosis: async (batchId: string, reason?: string) => {
    try {
      await fetch(`/api/diagnosis/${batchId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      await get().fetchAuditLogs();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchAuditLogs: async (options = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams(options as any).toString();
      const res = await fetch(`/api/audit/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        set({ 
          auditLogs: data.data.logs, 
          auditTotal: data.data.total 
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  rollbackBatch: async (batchId: string, reason: string) => {
    try {
      const res = await fetch(`/api/audit/rollback/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchAuditLogs();
        await get().fetchBatches();
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  compareBatches: async (id1: string, id2: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/diagnosis/compare/${id1}/${id2}`);
      const data = await res.json();
      if (data.success) {
        set({ versionComparison: data.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchDictionary: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/dictionary');
      const data = await res.json();
      if (data.success) {
        set({ dictionary: data.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateDictionary: async (id: string, value: string, reason: string) => {
    try {
      const res = await fetch(`/api/dictionary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, reason })
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchDictionary();
        await get().fetchAuditLogs();
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchDictionaryComparison: async (id: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/dictionary/${id}/compare-latest`);
      const data = await res.json();
      if (data.success) {
        set({ dictionaryComparison: data.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchPermissionRequests: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/permissions/requests');
      const data = await res.json();
      if (data.success) {
        set({ permissionRequests: data.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  createPermissionRequest: async (requestedPermission: string, reason: string) => {
    try {
      const res = await fetch('/api/permissions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedPermission, reason })
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchPermissionRequests();
        await get().fetchAuditLogs();
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  approvePermission: async (id: string) => {
    try {
      const res = await fetch(`/api/permissions/approve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchPermissionRequests();
        await get().fetchAuditLogs();
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  rejectPermission: async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/permissions/reject/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectReason: reason })
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchPermissionRequests();
        await get().fetchAuditLogs();
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchBoundaryCases: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/boundary/cases');
      const data = await res.json();
      if (data.success) {
        set({ boundaryCases: data.data });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  runBoundaryCase: async (caseId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/boundary/run/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchBatches();
        return data.data;
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  runAllBoundaryCases: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/boundary/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchBatches();
        return data.data;
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  setError: (error) => set({ error })
}));
