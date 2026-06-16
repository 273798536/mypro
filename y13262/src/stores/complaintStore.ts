import { create } from 'zustand';
import type {
  Complaint,
  GetComplaintResponse,
  ConfirmationLog,
  ComplaintStatus,
  ExportFormat,
  GetComplaintsQuery,
  GetHistoriesQuery,
  GetComplaintsResponse,
  GetHistoriesResponse,
} from '../../shared/types';

interface FilterState {
  status: ComplaintStatus | '';
  keyword: string;
  date_from: string;
  date_to: string;
}

interface ComplaintStore {
  complaints: Complaint[];
  total: number;
  currentComplaint: GetComplaintResponse | null;
  histories: ConfirmationLog[];
  historiesTotal: number;
  loading: boolean;
  error: string | null;
  filters: FilterState;

  fetchComplaints: (filters?: Partial<FilterState>) => Promise<void>;
  fetchComplaint: (id: string) => Promise<void>;
  updateNote: (id: string, note: string) => Promise<void>;
  createMerge: (complaint_ids: string[], merged_location: string, merge_basis: string) => Promise<void>;
  confirmMerge: (merge_id: string) => Promise<void>;
  unmerge: (merge_id: string) => Promise<void>;
  fetchHistories: (filters?: GetHistoriesQuery) => Promise<void>;
  exportData: (filters: Partial<FilterState>, format: ExportFormat) => Promise<void>;
  setFilters: (filters: Partial<FilterState>) => void;
}

export const useComplaintStore = create<ComplaintStore>((set, get) => ({
  complaints: [],
  total: 0,
  currentComplaint: null,
  histories: [],
  historiesTotal: 0,
  loading: false,
  error: null,
  filters: {
    status: '',
    keyword: '',
    date_from: '',
    date_to: '',
  },

  fetchComplaints: async (filters?: Partial<FilterState>) => {
    set({ loading: true, error: null });
    try {
      const currentFilters = { ...get().filters, ...filters };
      const params: GetComplaintsQuery = {};
      if (currentFilters.status) params.status = currentFilters.status as ComplaintStatus;
      if (currentFilters.keyword) params.keyword = currentFilters.keyword;
      if (currentFilters.date_from) params.date_from = currentFilters.date_from;
      if (currentFilters.date_to) params.date_to = currentFilters.date_to;

      const qs = new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined && v !== '') acc[k] = String(v);
          return acc;
        }, {})
      ).toString();

      const res = await fetch(`/api/complaints${qs ? '?' + qs : ''}`);
      if (!res.ok) throw new Error('获取投诉列表失败');
      const data: GetComplaintsResponse = await res.json();
      set({ complaints: data.complaints, total: data.total, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchComplaint: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/complaints/${id}`);
      if (!res.ok) throw new Error('获取投诉详情失败');
      const data: GetComplaintResponse = await res.json();
      set({ currentComplaint: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateNote: async (id: string, note: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, changed_by: '当前用户' }),
      });
      if (!res.ok) throw new Error('更新备注失败');
      const data = await res.json();
      const updatedComplaint = data.complaint;
      set((state) => ({
        currentComplaint: state.currentComplaint
          ? { ...state.currentComplaint, complaint: updatedComplaint }
          : null,
        complaints: state.complaints.map((c) => (c.id === id ? updatedComplaint : c)),
        loading: false,
      }));
      await get().fetchHistories();
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createMerge: async (complaint_ids: string[], merged_location: string, merge_basis: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/merges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint_ids, merged_location, merge_basis }),
      });
      if (!res.ok) throw new Error('创建归并失败');
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  confirmMerge: async (merge_id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/merges/${merge_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('确认归并失败');
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  unmerge: async (merge_id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/merges/${merge_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('取消归并失败');
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchHistories: async (filters?: GetHistoriesQuery) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(
        Object.entries(filters || {}).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined && v !== '') acc[k] = String(v);
          return acc;
        }, {})
      ).toString();

      const res = await fetch(`/api/histories${params ? '?' + params : ''}`);
      if (!res.ok) throw new Error('获取历史记录失败');
      const data: GetHistoriesResponse = await res.json();
      set({ histories: data.logs, historiesTotal: data.total, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  exportData: async (filters: Partial<FilterState>, format: ExportFormat) => {
    try {
      const body: Record<string, string> = { format };
      if (filters.status) body.status = filters.status;
      if (filters.date_from) body.date_from = filters.date_from;
      if (filters.date_to) body.date_to = filters.date_to;
      if (filters.keyword) body.keyword = filters.keyword;

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('导出失败');

      if (format === 'json') {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'complaints.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'complaints.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setFilters: (filters: Partial<FilterState>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
