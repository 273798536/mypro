import { create } from 'zustand';
import type { FunnelReport } from '@/data/types';
import { funnelReports } from '@/data/mockData';

interface HistoryStore {
  reports: FunnelReport[];
  selectedReportId: string | null;
  compareReportId: string | null;
  showComparison: boolean;

  selectReport: (id: string | null) => void;
  selectCompareReport: (id: string | null) => void;
  toggleComparison: () => void;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  reports: funnelReports,
  selectedReportId: funnelReports.length > 0 ? funnelReports[funnelReports.length - 1].id : null,
  compareReportId: funnelReports.length > 1 ? funnelReports[0].id : null,
  showComparison: false,

  selectReport: (id) => set({ selectedReportId: id }),
  selectCompareReport: (id) => set({ compareReportId: id }),
  toggleComparison: () => set((state) => ({ showComparison: !state.showComparison })),
}));
