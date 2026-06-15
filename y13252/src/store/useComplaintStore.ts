import { create } from 'zustand';
import type { Complaint } from '../../shared/types.js';
import { complaintApi } from '../lib/api.js';

interface ComplaintState {
  complaints: Complaint[];
  selectedComplaintId: string | null;
  loading: boolean;
  error: string | null;
  reportContent: string | null;
  reportVersion: number;
  status: {
    lastProcessedAt: string;
    currentComplaintId: string | null;
    reportVersion: number;
    totalComplaints: number;
    pendingCount: number;
    processingCount: number;
    resolvedCount: number;
  } | null;
  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  selectComplaint: (id: string | null) => void;
  seedData: () => Promise<void>;
  rerunCheck: (id: string) => Promise<void>;
  fetchReport: (id: string) => Promise<void>;
  fetchStatus: () => Promise<void>;
  addPhoto: (id: string, data: {
    originalName: string;
    systemName: string;
    url: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
  }) => Promise<void>;
  getSelectedComplaint: () => Complaint | undefined;
}

export const useComplaintStore = create<ComplaintState>((set, get) => ({
  complaints: [],
  selectedComplaintId: null,
  loading: false,
  error: null,
  reportContent: null,
  reportVersion: 1,
  status: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const data = await complaintApi.getAll();
      set({ complaints: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await complaintApi.getById(id);
      set(state => ({
        complaints: state.complaints.map(c => c.id === id ? data : c)
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  selectComplaint: (id) => {
    set({ selectedComplaintId: id });
  },

  seedData: async () => {
    set({ loading: true, error: null });
    try {
      await complaintApi.seed();
      await get().fetchAll();
      await get().fetchStatus();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '生成数据失败' });
    } finally {
      set({ loading: false });
    }
  },

  rerunCheck: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await complaintApi.rerun(id);
      await get().fetchById(id);
      await get().fetchStatus();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '重跑失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchReport: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await complaintApi.getReport(id);
      set({ reportContent: data.report, reportVersion: data.version });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '生成报告失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchStatus: async () => {
    try {
      const data = await complaintApi.getStatus();
      set({ status: data });
    } catch (err) {
      console.error('获取状态失败', err);
    }
  },

  addPhoto: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      await complaintApi.addPhoto(id, data);
      await get().fetchById(id);
      await get().fetchStatus();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '补录照片失败' });
    } finally {
      set({ loading: false });
    }
  },

  getSelectedComplaint: () => {
    const { complaints, selectedComplaintId } = get();
    return complaints.find(c => c.id === selectedComplaintId);
  }
}));
