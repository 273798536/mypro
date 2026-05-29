import { create } from 'zustand';
import type { LogStoreState, TrainingLogEntry } from '../types';
import { detectAllAnomalies } from '../utils/anomalyDetector';

export const useLogStore = create<LogStoreState>((set, get) => ({
  logEntries: [],
  anomalies: [],
  selectedParams: ['step'],
  isLoading: false,

  loadLog: (entries: TrainingLogEntry[]) => {
    const sortedEntries = [...entries].sort((a, b) => a.step - b.step);
    const paramKeys = new Set<string>();
    sortedEntries.forEach(e => {
      Object.keys(e.params || {}).forEach(k => paramKeys.add(k));
    });
    
    set({
      logEntries: sortedEntries,
      selectedParams: ['step', 'learningRate', ...Array.from(paramKeys).slice(0, 3)],
      isLoading: false
    });
    
    get().detectAnomalies();
  },

  detectAnomalies: () => {
    const { logEntries } = get();
    const anomalies = detectAllAnomalies(logEntries);
    set({ anomalies });
  },

  selectParam: (param: string) => {
    set(state => {
      const params = state.selectedParams.includes(param)
        ? state.selectedParams.filter(p => p !== param)
        : [...state.selectedParams, param];
      return { selectedParams: params };
    });
  },

  clearLog: () => {
    set({
      logEntries: [],
      anomalies: [],
      selectedParams: ['step']
    });
  }
}));
