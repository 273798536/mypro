import { create } from 'zustand';
import type { Anomaly, SensorRecord, StatsSummary } from 'shared/types';
import { api } from '@/lib/api';

interface AppState {
  initialized: boolean;
  loading: boolean;
  records: SensorRecord[];
  anomalies: Anomaly[];
  stats: StatsSummary | null;
  error: string | null;
  initIfNeeded: () => Promise<void>;
  reloadAll: () => Promise<void>;
  runDetection: () => Promise<void>;
  updateAnomalyRemark: (id: string, remark: string) => Promise<Anomaly>;
  updateAnomalyStatus: (id: string, status: Anomaly['status']) => Promise<Anomaly>;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: false,
  records: [],
  anomalies: [],
  stats: null,
  error: null,

  async initIfNeeded() {
    if (get().initialized) return;
    await get().reloadAll();
  },

  async reloadAll() {
    set({ loading: true, error: null });
    try {
      await api.seed();
      const [records, anomalies, stats] = await Promise.all([
        api.getRecords(),
        api.getAnomalies(),
        api.getStats(),
      ]);
      set({ records, anomalies, stats, initialized: true, loading: false });
    } catch (err: any) {
      set({ error: err?.message ?? '加载数据失败', loading: false });
    }
  },

  async runDetection() {
    set({ loading: true });
    try {
      await api.runDetection();
      const [anomalies, stats] = await Promise.all([api.getAnomalies(), api.getStats()]);
      set({ anomalies, stats, loading: false });
    } catch (err: any) {
      set({ error: err?.message ?? '检测失败', loading: false });
    }
  },

  async updateAnomalyRemark(id: string, remark: string) {
    const updated = await api.updateRemark(id, remark);
    const anomalies = get().anomalies.map(a => (a.id === id ? updated : a));
    const stats = await api.getStats();
    set({ anomalies, stats });
    return updated;
  },

  async updateAnomalyStatus(id: string, status: Anomaly['status']) {
    const updated = await api.updateStatus(id, status);
    const anomalies = get().anomalies.map(a => (a.id === id ? updated : a));
    const stats = await api.getStats();
    set({ anomalies, stats });
    return updated;
  },
}));
