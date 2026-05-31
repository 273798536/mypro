import { create } from 'zustand';
import type { DashboardStats, TrendItem, WarningItem } from '../../shared/types';
import { apiGet } from '@/utils/api';

interface DashboardState {
  stats: DashboardStats | null;
  trend: TrendItem[];
  warnings: WarningItem[];
  loading: boolean;
  fetchStats: () => Promise<void>;
  fetchTrend: () => Promise<void>;
  fetchWarnings: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  trend: [],
  warnings: [],
  loading: false,
  fetchStats: async () => {
    set({ loading: true });
    try {
      const data = await apiGet<DashboardStats>('/dashboard/stats');
      set({ stats: data });
    } finally {
      set({ loading: false });
    }
  },
  fetchTrend: async () => {
    set({ loading: true });
    try {
      const data = await apiGet<TrendItem[]>('/dashboard/trend');
      set({ trend: data });
    } finally {
      set({ loading: false });
    }
  },
  fetchWarnings: async () => {
    set({ loading: true });
    try {
      const data = await apiGet<WarningItem[]>('/dashboard/warnings');
      set({ warnings: data });
    } finally {
      set({ loading: false });
    }
  },
}));
