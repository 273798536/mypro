import { create } from 'zustand';
import type { GameRecord } from '../types';

const HISTORY_KEY = 'gate_game_history';
const MAX_HISTORY = 50;

interface HistoryStore {
  records: GameRecord[];
  loadRecords: () => void;
  addRecord: (record: GameRecord) => void;
  getRecordById: (id: string) => GameRecord | undefined;
  clearAll: () => void;
  deleteRecord: (id: string) => void;
  getTopScores: (limit?: number) => GameRecord[];
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  records: [],

  loadRecords: () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        set({ records: JSON.parse(stored) });
      }
    } catch {
      console.error('Failed to load history records');
    }
  },

  addRecord: (record) => {
    set((state) => {
      const newRecords = [record, ...state.records].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newRecords));
      } catch {
        console.error('Failed to save history record');
      }
      return { records: newRecords };
    });
  },

  getRecordById: (id) => {
    return get().records.find(r => r.id === id);
  },

  clearAll: () => {
    set({ records: [] });
    localStorage.removeItem(HISTORY_KEY);
  },

  deleteRecord: (id) => {
    set((state) => {
      const newRecords = state.records.filter(r => r.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newRecords));
      return { records: newRecords };
    });
  },

  getTopScores: (limit = 10) => {
    return [...get().records]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  },
}));
