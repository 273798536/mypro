import { create } from 'zustand';
import {
  ChangeHistory,
} from '../types';
import {
  saveToStore,
  getAllFromStore,
  saveSingleToStore,
} from '../utils/storage';
import { registerStore } from './registry';

interface HistoryState {
  history: ChangeHistory[];
  changeHistories: ChangeHistory[];
  isLoading: boolean;
  error: string | null;

  loadFromStorage: () => Promise<void>;
  addHistory: (history: ChangeHistory) => void;
  getHistoryByBooking: (bookingId: string) => ChangeHistory[];
  getChangeRoomHistory: () => ChangeHistory[];
  getHistoryByDateRange: (startDate: string, endDate: string) => ChangeHistory[];
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  get changeHistories() {
    return get().history;
  },
  isLoading: false,
  error: null,

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const history = await getAllFromStore<ChangeHistory>('changeHistory');
      set({
        history: history.sort(
          (a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime(),
        ),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载历史记录失败',
        isLoading: false,
      });
    }
  },

  addHistory: (record) => {
    const { history } = get();
    const updatedHistory = [record, ...history].sort(
      (a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime(),
    );
    saveSingleToStore('changeHistory', record);
    set({ history: updatedHistory });
  },

  getHistoryByBooking: (bookingId) => {
    return get().history.filter(h => h.bookingId === bookingId);
  },

  getChangeRoomHistory: () => {
    return get().history.filter(h => h.actionType === 'change_room');
  },

  getHistoryByDateRange: (startDate, endDate) => {
    return get().history.filter(h => {
      const operatedAt = new Date(h.operatedAt);
      return operatedAt >= new Date(startDate) && operatedAt <= new Date(endDate);
    });
  },
}));

registerStore('history', useHistoryStore);
