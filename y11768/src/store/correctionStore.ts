import { create } from 'zustand';
import type { CorrectionLog } from '@/data/types';
import { correctionLogs as initialLogs } from '@/data/mockData';

interface CorrectionStore {
  logs: CorrectionLog[];
  addLog: (log: CorrectionLog) => void;
}

export const useCorrectionStore = create<CorrectionStore>((set) => ({
  logs: initialLogs,

  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
}));
