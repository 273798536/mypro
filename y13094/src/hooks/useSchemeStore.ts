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

  setList: (items: SchemeListItem[], total: number) => void;
  setLoading: (v: boolean) => void;
  setFilters: (f: ListQuery) => void;
  resetFilters: () => void;
  setCurrentDetail: (d: SchemeDetail | null) => void;
  setDetailLoading: (v: boolean) => void;
  openRejudgeModal: (id: string) => void;
  closeRejudgeModal: () => void;

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

export const useSchemeStore = create<SchemeStore>((set, get) => ({
  list: [],
  total: 0,
  loading: false,
  filters: { ...emptyFilters },
  currentDetail: null,
  detailLoading: false,
  rejudgeModalOpen: false,
  rejudgeTargetId: null,

  setList: (items, total) => set({ list: items, total }),
  setLoading: (v) => set({ loading: v }),
  setFilters: (f) => set({ filters: f }),
  resetFilters: () => set({ filters: { ...emptyFilters } }),
  setCurrentDetail: (d) => set({ currentDetail: d }),
  setDetailLoading: (v) => set({ detailLoading: v }),
  openRejudgeModal: (id) => set({ rejudgeModalOpen: true, rejudgeTargetId: id }),
  closeRejudgeModal: () => set({ rejudgeModalOpen: false, rejudgeTargetId: null }),

  fetchList: async () => {
    set({ loading: true });
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
      const data = await res.json();
      set({ list: data.items, total: data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchDetail: async (id) => {
    set({ detailLoading: true });
    try {
      const res = await fetch(`/api/schemes/${id}`);
      const data = await res.json();
      set({ currentDetail: data, detailLoading: false });
    } catch {
      set({ detailLoading: false });
    }
  },

  rejudge: async (id, newConclusion, reason, operator) => {
    await fetch(`/api/schemes/${id}/rejudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newConclusion, reason, operator }),
    });
    await get().fetchDetail(id);
  },

  updateNote: async (id, note, operator) => {
    await fetch(`/api/schemes/${id}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplementaryNote: note, operator }),
    });
    await get().fetchDetail(id);
  },

  exportMarkdown: async (schemeIds, filters) => {
    const res = await fetch('/api/report/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemeIds, filters }),
    });
    return res.json();
  },
}));
