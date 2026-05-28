import { create } from 'zustand';
import type { GetResultsFilters } from '../../shared/types';

interface AppState {
  filters: GetResultsFilters;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  pendingCount: number;
  updateFilters: (filters: Partial<GetResultsFilters>) => void;
  increasePendingCount: (amount?: number) => void;
  decreasePendingCount: (amount?: number) => void;
  setPendingCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  filters: {},
  currentUser: {
    id: '1',
    name: '管理员',
    role: 'admin',
  },
  pendingCount: 0,
  updateFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  increasePendingCount: (amount = 1) =>
    set((state) => ({
      pendingCount: state.pendingCount + amount,
    })),
  decreasePendingCount: (amount = 1) =>
    set((state) => ({
      pendingCount: Math.max(0, state.pendingCount - amount),
    })),
  setPendingCount: (count) =>
    set(() => ({
      pendingCount: count,
    })),
}));
