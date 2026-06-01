import { create } from 'zustand';
import type {
  TariffTable,
  UsageRecord,
  CalculationVersion,
  TraceNode,
} from '../../shared/types';
import { api } from '../utils/api';

interface AppState {
  tariffs: TariffTable[];
  usageRecords: UsageRecord[];
  versions: CalculationVersion[];
  currentVersion: CalculationVersion | null;
  currentTraceTree: TraceNode | null;
  loading: boolean;
  error: string | null;
  selectedTariffId: string | null;
  selectedUsageId: string | null;
  loadTariffs: () => Promise<void>;
  loadUsageRecords: () => Promise<void>;
  loadVersions: () => Promise<void>;
  setSelectedTariffId: (id: string | null) => void;
  setSelectedUsageId: (id: string | null) => void;
  calculate: (
    tariffId: string,
    usageId: string,
    versionName: string,
    note?: string
  ) => Promise<CalculationVersion | null>;
  loadVersionDetail: (id: string) => Promise<void>;
  loadTraceTree: (versionId: string) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tariffs: [],
  usageRecords: [],
  versions: [],
  currentVersion: null,
  currentTraceTree: null,
  loading: false,
  error: null,
  selectedTariffId: null,
  selectedUsageId: null,

  loadTariffs: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.tariffs.getAll();
      set({ tariffs: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载电价表失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadUsageRecords: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.usageRecords.getAll();
      set({ usageRecords: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载用电记录失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadVersions: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.versions.getAll();
      set({ versions: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载版本列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  setSelectedTariffId: (id) => set({ selectedTariffId: id }),
  setSelectedUsageId: (id) => set({ selectedUsageId: id }),

  calculate: async (tariffId, usageId, versionName, note) => {
    set({ loading: true, error: null });
    try {
      const result = await api.calculate.execute({
        tariffTableId: tariffId,
        usageRecordId: usageId,
        versionName,
        note,
      });

      set((state) => ({
        versions: [result.version, ...state.versions],
        currentVersion: result.version,
        selectedTariffId: null,
        selectedUsageId: null,
      }));

      return result.version;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '核算失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  loadVersionDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.versions.getById(id);
      set({ currentVersion: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载版本详情失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadTraceTree: async (versionId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.trace.getTree(versionId);
      set({ currentTraceTree: data.traceTree });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载溯源树失败' });
    } finally {
      set({ loading: false });
    }
  },

  deleteVersion: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.versions.delete(id);
      set((state) => ({
        versions: state.versions.filter((v) => v.id !== id),
        currentVersion:
          state.currentVersion?.id === id ? null : state.currentVersion,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除版本失败' });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
