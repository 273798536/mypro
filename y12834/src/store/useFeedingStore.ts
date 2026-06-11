import { create } from 'zustand';
import type { FeedingRecord } from '../types';
import { getFeedingRecords, setFeedingRecords } from '../utils/storage';
import { initMockData, isMockDataInitialized } from '../data/mockData';

interface FeedingState {
  records: FeedingRecord[];
  init: () => void;
  getRecordsByDate: (date: string) => FeedingRecord[];
  getRecordsByDateRange: (start: string, end: string) => FeedingRecord[];
  addRecord: (record: FeedingRecord) => void;
  updateRecord: (id: string, patch: Partial<FeedingRecord>) => void;
  deleteRecord: (id: string) => void;
}

export const useFeedingStore = create<FeedingState>((set, get) => ({
  records: [],

  init: () => {
    if (!isMockDataInitialized()) {
      initMockData();
    }
    const records = getFeedingRecords();
    set({ records });
  },

  getRecordsByDate: (date) => {
    return get().records.filter((r) => r.date === date);
  },

  getRecordsByDateRange: (start, end) => {
    return get().records.filter((r) => r.date >= start && r.date <= end);
  },

  addRecord: (record) =>
    set((state) => {
      const newRecords = [...state.records, record];
      setFeedingRecords(newRecords);
      return { records: newRecords };
    }),

  updateRecord: (id, patch) =>
    set((state) => {
      const newRecords = state.records.map((r) =>
        r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r
      );
      setFeedingRecords(newRecords);
      return { records: newRecords };
    }),

  deleteRecord: (id) =>
    set((state) => {
      const newRecords = state.records.filter((r) => r.id !== id);
      setFeedingRecords(newRecords);
      return { records: newRecords };
    }),
}));
