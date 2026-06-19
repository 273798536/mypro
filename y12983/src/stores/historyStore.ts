import { create } from 'zustand';
import type { HistoryLog } from '@/types';
import { historyService } from '@/services/historyService';

interface HistoryState {
  history: HistoryLog[];
  recentHistory: HistoryLog[];
  loading: boolean;

  fetchByGapId: (gapId: string) => void;
  fetchRecent: (limit?: number) => void;
  add: (log: Omit<HistoryLog, 'id' | 'operatedAt'>) => HistoryLog;
  resetToMock: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  recentHistory: [],
  loading: false,

  fetchByGapId: (gapId: string) => {
    const history = historyService.listByGapId(gapId);
    set({ history });
  },

  fetchRecent: (limit = 10) => {
    const recentHistory = historyService.listRecent(limit);
    set({ recentHistory });
  },

  add: (log) => {
    const newLog = historyService.add(log);
    get().fetchByGapId(log.gapId);
    get().fetchRecent(10);
    return newLog;
  },

  resetToMock: () => {
    historyService.resetToMock();
  },
}));
