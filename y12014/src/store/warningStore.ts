import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Warning, WarningFilter, WarningStatus, TraceNode } from '../../shared/types';

interface WarningState {
  warnings: Warning[];
  total: number;
  currentWarning: Warning | null;
  traceNodes: TraceNode[];
  filter: WarningFilter;
  isLoading: boolean;
  selectedIds: string[];
  
  setFilter: (filter: Partial<WarningFilter>) => void;
  resetFilter: () => void;
  fetchWarnings: () => Promise<void>;
  fetchWarningDetail: (id: string) => Promise<void>;
  fetchTraceNodes: (id: string) => Promise<void>;
  submitReview: (id: string, result: WarningStatus, opinion: string) => Promise<boolean>;
  refreshWarnings: () => Promise<void>;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

const defaultFilter: WarningFilter = {
  page: 1,
  pageSize: 10
};

export const useWarningStore = create<WarningState>()(
  persist(
    (set, get) => ({
      warnings: [],
      total: 0,
      currentWarning: null,
      traceNodes: [],
      filter: defaultFilter,
      isLoading: false,
      selectedIds: [],

      setFilter: (newFilter) => {
        set((state) => ({
          filter: { ...state.filter, ...newFilter, page: 1 }
        }));
      },

      resetFilter: () => {
        set({ filter: defaultFilter });
      },

      fetchWarnings: async () => {
        set({ isLoading: true });
        try {
          const { filter } = get();
          const params = new URLSearchParams();
          Object.entries(filter).forEach(([key, value]) => {
            if (value) params.append(key, String(value));
          });
          
          const res = await fetch(`/api/warnings?${params}`);
          const data = await res.json();
          
          if (data.code === 0) {
            set({
              warnings: data.data.items,
              total: data.data.total,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Failed to fetch warnings:', error);
          set({ isLoading: false });
        }
      },

      fetchWarningDetail: async (id: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/warnings/${id}`);
          const data = await res.json();
          
          if (data.code === 0) {
            set({
              currentWarning: data.data,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Failed to fetch warning detail:', error);
          set({ isLoading: false });
        }
      },

      fetchTraceNodes: async (id: string) => {
        try {
          const res = await fetch(`/api/warnings/${id}/trace`);
          const data = await res.json();
          
          if (data.code === 0) {
            set({ traceNodes: data.data });
          }
        } catch (error) {
          console.error('Failed to fetch trace nodes:', error);
        }
      },

      submitReview: async (id: string, result: WarningStatus, opinion: string) => {
        try {
          const res = await fetch(`/api/warnings/${id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result, opinion, reviewer: '风控专员' })
          });
          const data = await res.json();
          
          if (data.code === 0) {
            await get().fetchWarnings();
            await get().fetchWarningDetail(id);
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to submit review:', error);
          return false;
        }
      },

      refreshWarnings: async () => {
        set({ isLoading: true });
        try {
          await fetch('/api/warnings/refresh', { method: 'PUT' });
          await get().fetchWarnings();
        } catch (error) {
          console.error('Failed to refresh warnings:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      toggleSelect: (id: string) => {
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter(i => i !== id)
            : [...state.selectedIds, id]
        }));
      },

      selectAll: (ids: string[]) => {
        set({ selectedIds: ids });
      },

      clearSelection: () => {
        set({ selectedIds: [] });
      }
    }),
    {
      name: 'warning-store',
      partialize: (state) => ({ filter: state.filter })
    }
  )
);
