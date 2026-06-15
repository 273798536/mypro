import { create } from 'zustand';
import type { HistoryRecord, HistoryActionType } from '@/types';
import { mockHistoryRecords } from '@/data/mockData';

interface HistoryState {
  records: HistoryRecord[];
  loading: boolean;
  error: string | null;
  selectedRecordId: string | null;
}

interface HistoryActions {
  fetchRecords: () => Promise<void>;
  getRecordById: (id: string) => HistoryRecord | undefined;
  getRecordsByActionType: (type: HistoryActionType) => HistoryRecord[];
  getRecordsByDate: (date: string) => HistoryRecord[];
  addRecord: (
    operator: string,
    actionType: HistoryActionType,
    beforeData: Record<string, any>,
    afterData: Record<string, any>,
    explanation: string
  ) => HistoryRecord;
  selectRecord: (id: string | null) => void;
  getShiftRecords: () => HistoryRecord[];
}

export type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  records: [],
  loading: false,
  error: null,
  selectedRecordId: null,

  fetchRecords: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      set({ records: mockHistoryRecords, loading: false });
    } catch (err) {
      set({ error: '加载历史记录失败', loading: false });
    }
  },

  getRecordById: (id) => {
    return get().records.find((r) => r.id === id);
  },

  getRecordsByActionType: (type) => {
    return get().records.filter((r) => r.actionType === type);
  },

  getRecordsByDate: (date) => {
    return get().records.filter((r) => r.createdAt.startsWith(date));
  },

  addRecord: (operator, actionType, beforeData, afterData, explanation) => {
    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}`,
      operator,
      actionType,
      beforeData,
      afterData,
      explanation,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ records: [newRecord, ...state.records] }));
    return newRecord;
  },

  selectRecord: (id) => {
    set({ selectedRecordId: id });
  },

  getShiftRecords: () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const records = get().records.filter((r) => r.createdAt.startsWith(today));
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
}));
