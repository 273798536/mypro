import { create } from 'zustand';
import type { SchemeListItem, SchemeDetail, ListQuery, ConclusionStatus } from '../../shared/types';

interface SchemeStore {
  list: SchemeListItem[];
  total: number;
  loading: boolean;
  filters: ListQuery;
  currentDetail: SchemeDetail | null;
  detailLoading: boolean;
  rejudgeModalOpen: boolean;
  rejudgeTargetId: string | null;
  lastError: string | null;

  setList: (items: SchemeListItem[], total: number) => void;
  setLoading: (v: boolean) => void;
  setFilters: (f: ListQuery) => void;
  resetFilters: () => void;
  setCurrentDetail: (d: SchemeDetail | null) => void;
  setDetailLoading: (v: boolean) => void;
  openRejudgeModal: (id: string) => void;
  closeRejudgeModal: () => void;
  clearError: () => void;

  fetchList: () => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  rejudge: (id: string, newConclusion: ConclusionStatus, reason: string, operator: string) => Promise<void>;
  updateNote: (id: string, note: string, operator: string) => Promise<void>;
  exportMarkdown: (schemeIds?: string[], filters?: ListQuery) => Promise<{ content: string; filename: string }>;
}

const emptyFilters: ListQuery = {
  bridgeTunnelName: '',
  schemeType: '',
  conclusion: '',
  hasGap: '',
  dateFrom: '',
  dateTo: '',
};

function notifyError(msg: string) {
  try {
    window.alert(msg);
  } catch {
    console.error(msg);
  }
}

export const useSchemeStore = create<SchemeStore>((set, get) => ({
  list: [],
  total: 0,
  loading: false,
  filters: { ...emptyFilters },
  currentDetail: null,
  detailLoading: false,
  rejudgeModalOpen: false,
  rejudgeTargetId: null,
  lastError: null,

  setList: (items, total) => set({ list: items, total, lastError: null }),
  setLoading: (v) => set({ loading: v }),
  setFilters: (f) => set({ filters: f }),
  resetFilters: () => set({ filters: { ...emptyFilters } }),
  setCurrentDetail: (d) => set({ currentDetail: d, lastError: null }),
  setDetailLoading: (v) => set({ detailLoading: v }),
  openRejudgeModal: (id) => set({ rejudgeModalOpen: true, rejudgeTargetId: id }),
  closeRejudgeModal: () => set({ rejudgeModalOpen: false, rejudgeTargetId: null }),
  clearError: () => set({ lastError: null }),

  fetchList: async () => {
    set({ loading: true, lastError: null });
    try {
      const f = get().filters;
      const params = new URLSearchParams();
      if (f.bridgeTunnelName) params.set('bridgeTunnelName', f.bridgeTunnelName);
      if (f.schemeType) params.set('schemeType', f.schemeType);
      if (f.conclusion) params.set('conclusion', f.conclusion);
      if (f.hasGap) params.set('hasGap', f.hasGap);
      if (f.dateFrom) params.set('dateFrom', f.dateFrom);
      if (f.dateTo) params.set('dateTo', f.dateTo);
      const res = await fetch(`/api/schemes?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ list: data.items, total: data.total, loading: false });
    } catch (e) {
      const msg = `加载方案列表失败：${e instanceof Error ? e.message : String(e)}`;
      set({ loading: false, lastError: msg });
      notifyError(msg);
    }
  },

  fetchDetail: async (id) => {
    set({ detailLoading: true, lastError: null });
    try {
      const res = await fetch(`/api/schemes/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ currentDetail: data, detailLoading: false });
    } catch (e) {
      const msg = `加载方案详情失败：${e instanceof Error ? e.message : String(e)}`;
      set({ detailLoading: false, lastError: msg });
      notifyError(msg);
    }
  },

  rejudge: async (id, newConclusion, reason, operator) => {
    try {
      const res = await fetch(`/api/schemes/${id}/rejudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newConclusion, reason, operator }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await get().fetchDetail(id);
    } catch (e) {
      const msg = `改判失败：${e instanceof Error ? e.message : String(e)}`;
      set({ lastError: msg });
      notifyError(msg);
      throw e;
    }
  },

  updateNote: async (id, note, operator) => {
    try {
      const res = await fetch(`/api/schemes/${id}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementaryNote: note, operator }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await get().fetchDetail(id);
    } catch (e) {
      const msg = `保存备注失败：${e instanceof Error ? e.message : String(e)}`;
      set({ lastError: msg });
      notifyError(msg);
      throw e;
    }
  },

  exportMarkdown: async (schemeIds, filters) => {
    try {
      const res = await fetch('/api/report/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemeIds, filters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ content: string; filename: string }>;
    } catch (e) {
      const msg = `导出 Markdown 报告失败：${e instanceof Error ? e.message : String(e)}`;
      set({ lastError: msg });
      notifyError(msg);
      throw e;
    }
  },
}));
