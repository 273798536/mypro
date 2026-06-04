import { create } from 'zustand';
import {
  api,
  type Level,
  type Violation,
  type Conclusion,
  type Draft,
  type HistoryEntry,
  type DedupResult,
  type ConsistencyReport,
  type ViolationFixError,
} from '@/api';

interface ViolationCounts {
  [levelId: string]: number;
}

interface AppState {
  levels: Level[];
  currentLevel: Level | null;
  violations: Violation[];
  affectedConclusions: Conclusion[];
  conclusions: Conclusion[];
  drafts: Draft[];
  history: HistoryEntry[];
  dedupResult: DedupResult | null;
  consistencyReport: ConsistencyReport | null;
  violationCounts: ViolationCounts;
  fixError: ViolationFixError | null;
  loading: boolean;
  error: string | null;
  seeded: boolean;

  seedData: () => Promise<void>;
  fetchLevels: () => Promise<void>;
  fetchLevel: (id: string) => Promise<void>;
  createLevel: (data: Parameters<typeof api.createLevel>[0]) => Promise<void>;
  updateLevel: (id: string, data: Parameters<typeof api.updateLevel>[1]) => Promise<void>;
  fetchViolations: (levelId: string) => Promise<void>;
  fetchViolationCounts: () => Promise<void>;
  updateViolation: (id: string, data: Parameters<typeof api.updateViolation>[1]) => Promise<void>;
  checkDedup: (levelId: string) => Promise<void>;
  mergeDuplicates: (canonicalId: string, duplicateIds: string[]) => Promise<void>;
  fetchConclusions: (levelId: string) => Promise<void>;
  fetchDrafts: (levelId: string) => Promise<void>;
  createDraft: (levelId: string, data: Parameters<typeof api.createDraft>[1]) => Promise<void>;
  fetchHistory: (params?: { entityType?: string; entityId?: string }) => Promise<void>;
  exportData: (data: Parameters<typeof api.exportData>[0]) => Promise<unknown>;
  checkConsistency: (levelIds: string[]) => Promise<void>;
  clearError: () => void;
  clearDedupResult: () => void;
  clearFixError: () => void;
  clearConsistencyReport: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  levels: [],
  currentLevel: null,
  violations: [],
  affectedConclusions: [],
  conclusions: [],
  drafts: [],
  history: [],
  dedupResult: null,
  consistencyReport: null,
  violationCounts: {},
  fixError: null,
  loading: false,
  error: null,
  seeded: false,

  seedData: async () => {
    if (get().seeded) return;
    try {
      set({ loading: true });
      await api.seed();
      set({ seeded: true, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchLevels: async () => {
    try {
      set({ loading: true });
      const levels = await api.getLevels();
      set({ levels, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchLevel: async (id) => {
    try {
      set({ loading: true });
      const level = await api.getLevel(id);
      set({ currentLevel: level, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createLevel: async (data) => {
    try {
      set({ loading: true });
      await api.createLevel(data);
      await get().fetchLevels();
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateLevel: async (id, data) => {
    try {
      set({ loading: true });
      const updated = await api.updateLevel(id, data);
      set({ currentLevel: updated, loading: false });
      await get().fetchLevels();
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchViolations: async (levelId) => {
    try {
      set({ loading: true });
      const res = await api.getViolations(levelId);
      set({
        violations: res.violations,
        affectedConclusions: res.affectedConclusions,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchViolationCounts: async () => {
    try {
      const levels = get().levels;
      const counts: ViolationCounts = {};
      await Promise.all(
        levels.map(async (level) => {
          try {
            const res = await api.getViolations(level.id);
            const openCount = res.violations.filter((v) => v.status === 'open').length;
            counts[level.id] = openCount;
          } catch {
            counts[level.id] = 0;
          }
        })
      );
      set({ violationCounts: counts });
    } catch {
      // silent
    }
  },

  updateViolation: async (id, data) => {
    try {
      set({ fixError: null });
      await api.updateViolation(id, data);
      const levelId = get().currentLevel?.id;
      if (levelId) await get().fetchViolations(levelId);
    } catch (e) {
      const err = e as Error & { data?: unknown };
      if (err.data && typeof err.data === 'object' && 'missingDraftNames' in (err.data as object)) {
        set({ fixError: err.data as ViolationFixError });
      }
      set({ error: err.message });
    }
  },

  checkDedup: async (levelId) => {
    try {
      set({ loading: true });
      const result = await api.checkDedup(levelId);
      set({ dedupResult: result, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  mergeDuplicates: async (canonicalId, duplicateIds) => {
    try {
      set({ loading: true });
      await api.mergeDuplicates(canonicalId, duplicateIds);
      set({ dedupResult: null });
      const levelId = get().currentLevel?.id;
      if (levelId) {
        await get().fetchViolations(levelId);
        await get().fetchConclusions(levelId);
      }
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchConclusions: async (levelId) => {
    try {
      set({ loading: true });
      const conclusions = await api.getConclusions(levelId);
      set({ conclusions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchDrafts: async (levelId) => {
    try {
      set({ loading: true });
      const drafts = await api.getDrafts(levelId);
      set({ drafts, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createDraft: async (levelId, data) => {
    try {
      set({ loading: true });
      await api.createDraft(levelId, data);
      await get().fetchDrafts(levelId);
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchHistory: async (params) => {
    try {
      set({ loading: true });
      const history = await api.getHistory(params);
      set({ history, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  exportData: async (data) => {
    try {
      set({ loading: true });
      const result = await api.exportData(data);
      set({ loading: false });
      return result;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      return null;
    }
  },

  checkConsistency: async (levelIds) => {
    try {
      set({ loading: true });
      const report = await api.checkConsistency(levelIds);
      set({ consistencyReport: report, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
  clearDedupResult: () => set({ dedupResult: null }),
  clearFixError: () => set({ fixError: null }),
  clearConsistencyReport: () => set({ consistencyReport: null }),
}));
